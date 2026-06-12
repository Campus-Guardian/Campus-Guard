const supabase = require('../config/supabase');
const analysisService = require('./analysisService');
const alertService = require('./alertService');

function countQualifiedDevices(rows) {
  return new Set((rows || []).map((item) => item.device_id)).size;
}

class NoiseCorrelationService {
  async process(event, zones, settings) {
    const level = Math.max(event.noise_level ?? -Infinity, event.noise_peak ?? -Infinity);
    if (event.latitude == null || event.longitude == null || !Number.isFinite(level)) return [];

    const alerts = [];
    for (const zone of zones) {
      if (!analysisService.isPointInPolygon([event.latitude, event.longitude], zone.polygon)) continue;
      const now = new Date(event.measured_at);
      const high = level >= settings.noise_threshold_db;
      const { error: counterError } = await supabase.rpc('cg_record_noise_sample', {
        p_zone_id: zone.id,
        p_device_id: event.device_id,
        p_measured_at: event.measured_at,
        p_is_high: high,
        p_window_seconds: settings.noise_window_seconds,
      });
      if (counterError) throw counterError;

      const windowStart = new Date(now.getTime() - settings.noise_window_seconds * 1000).toISOString();
      const { data: noisyDevices } = await supabase
        .from('noise_zone_device_state')
        .select('device_id')
        .eq('zone_id', zone.id)
        .gte('last_high_at', windowStart)
        .gte('high_reading_count', settings.noise_min_readings);

      const uniqueCount = countQualifiedDevices(noisyDevices);
      if (uniqueCount < settings.noise_min_devices) continue;

      const dedupeKey = `noise-zone:${zone.id}`;
      const { data: active } = await supabase
        .from('alerts')
        .select('last_seen')
        .eq('dedupe_key', dedupeKey)
        .eq('is_resolved', false)
        .maybeSingle();
      const { data: lastResolved } = active ? { data: null } : await supabase
        .from('alerts')
        .select('resolved_at')
        .eq('dedupe_key', dedupeKey)
        .eq('is_resolved', true)
        .order('resolved_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const inCooldown = lastResolved?.resolved_at
        && now - new Date(lastResolved.resolved_at) < settings.noise_cooldown_seconds * 1000;
      const recentlyTouched = active?.last_seen
        && now - new Date(active.last_seen) < 10000;

      if (!inCooldown && !recentlyTouched) {
        alerts.push(await alertService.createOrUpdate({
          dedupe_key: dedupeKey,
          zone_id: zone.id,
          type: 'noise_critical',
          severity: 'critical',
          message: `${zone.name} bolgesinde coklu cihaz gurultu alarmi`,
          details: {
            zone_name: zone.name,
            noisy_devices_count: uniqueCount,
            threshold_db: settings.noise_threshold_db,
            window_seconds: settings.noise_window_seconds,
          },
          latitude: event.latitude,
          longitude: event.longitude,
        }));
      }
    }
    return alerts.filter(Boolean);
  }

  async resolveStale(settings) {
    const staleBefore = new Date(Date.now() - settings.noise_resolve_seconds * 1000).toISOString();
    const { data: alerts } = await supabase
      .from('alerts')
      .select('dedupe_key, zone_id')
      .eq('alert_type', 'noise_critical')
      .eq('is_resolved', false)
      .not('zone_id', 'is', null);

    for (const alert of alerts || []) {
      const { count } = await supabase
        .from('noise_zone_device_state')
        .select('*', { count: 'exact', head: true })
        .eq('zone_id', alert.zone_id)
        .gte('last_high_at', staleBefore)
        .gte('high_reading_count', settings.noise_min_readings);
      if ((count || 0) < settings.noise_min_devices) {
        await alertService.resolve(alert.dedupe_key, null, 'noise_quorum_cleared');
      }
    }
  }
}

module.exports = new NoiseCorrelationService();
module.exports.countQualifiedDevices = countQualifiedDevices;
