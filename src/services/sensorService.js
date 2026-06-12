const supabase = require('../config/supabase');
const analysisService = require('./analysisService');
const alertService = require('./alertService');
const zoneAnalysisService = require('./zoneAnalysisService');
const noiseCorrelationService = require('./noiseCorrelationService');
const { getAnalysisSettings } = require('./settingsService');
const { emitDashboard, emitDevice } = require('../socket/socketHandler');

function isFreshEvent(measuredAt) {
  const age = Date.now() - new Date(measuredAt).getTime();
  return age >= -30000 && age <= 2 * 60 * 1000;
}

function toRow(event) {
  const magnitude = analysisService.accelerationMagnitude(event);
  return {
    event_id: event.event_id,
    device_id: event.device_id,
    timestamp: event.measured_at,
    measured_at: event.measured_at,
    received_at: new Date().toISOString(),
    app_state: event.app_state,
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    location_accuracy: event.location_accuracy ?? null,
    noise_level: event.noise_level ?? null,
    noise_peak: event.noise_peak ?? null,
    acceleration_x: event.acceleration_x ?? null,
    acceleration_y: event.acceleration_y ?? null,
    acceleration_z: event.acceleration_z ?? null,
    acceleration_magnitude: magnitude,
    speed: event.speed ?? null,
    battery_level: event.battery_level ?? null,
    network_type: event.network_type || null,
    sample_quality: event.sample_quality || {},
  };
}

class SensorService {
  async processSensorEvent(event) {
    const row = toRow(event);
    const { data: saved, error } = await supabase
      .from('sensor_data')
      .upsert(row, { onConflict: 'event_id', ignoreDuplicates: true })
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!saved) return { duplicate: true, saved: null, alerts: [] };

    const fresh = isFreshEvent(event.measured_at);
    if (!fresh) return { duplicate: false, stale: true, saved, alerts: [] };

    const deviceUpdates = {
      last_seen: new Date().toISOString(),
      is_active: true,
    };
    if (event.latitude != null && event.longitude != null) {
      deviceUpdates.last_latitude = event.latitude;
      deviceUpdates.last_longitude = event.longitude;
    }
    await supabase.from('devices').update(deviceUpdates).eq('id', event.device_id);

    const [{ data: zones }, settings, { data: previousEvents }] = await Promise.all([
      supabase.from('zones').select('*').eq('is_active', true),
      getAnalysisSettings(),
      supabase
        .from('sensor_data')
        .select('event_id, measured_at, speed, location_accuracy, acceleration_magnitude, acceleration_x, acceleration_y, acceleration_z')
        .eq('device_id', event.device_id)
        .neq('event_id', event.event_id)
        .lte('measured_at', event.measured_at)
        .order('measured_at', { ascending: false })
        .limit(4),
    ]);

    const alerts = [];
    alerts.push(...await zoneAnalysisService.process(event, zones || [], settings));
    alerts.push(...await noiseCorrelationService.process(event, zones || [], settings));

    const previous = previousEvents?.[0];
    const speedKey = `speed:${event.device_id}`;
    if (analysisService.hasSpeedViolation(event, previous, settings)) {
      alerts.push(await alertService.createOrUpdate({
        dedupe_key: speedKey,
        device_id: event.device_id,
        type: 'speed_violation',
        severity: event.speed > 50 ? 'critical' : 'high',
        message: `Hiz limiti asildi: ${event.speed.toFixed(1)} km/h`,
        details: { speed: event.speed, limit: settings.speed_limit_kmh },
        latitude: event.latitude,
        longitude: event.longitude,
      }));
    } else if (event.speed != null && event.speed <= settings.speed_limit_kmh) {
      await alertService.resolve(speedKey, null, 'speed_normalized');
    }

    const fallKey = `fall:${event.device_id}`;
    if (analysisService.hasFallImpact(event, previousEvents || [])) {
      alerts.push(await alertService.createOrUpdate({
        dedupe_key: fallKey,
        device_id: event.device_id,
        type: 'abnormal_motion',
        severity: 'critical',
        message: 'Serbest dusus sonrasi sert darbe algilandi',
        details: { magnitude: analysisService.accelerationMagnitude(event) },
        latitude: event.latitude,
        longitude: event.longitude,
      }));
    } else if ((analysisService.accelerationMagnitude(event) || 0) < 15) {
      await alertService.resolve(fallKey, null, 'motion_normalized');
    }

    if (event.is_emergency) {
      alerts.push(await alertService.createOrUpdate({
        dedupe_key: `emergency:${event.device_id}`,
        device_id: event.device_id,
        type: 'environmental',
        severity: 'critical',
        message: 'Ogrenci acil durum butonuna basti',
        latitude: event.latitude,
        longitude: event.longitude,
      }));
    }

    const { data: activeAlerts } = await supabase
      .from('alerts')
      .select('alert_type, severity, zone_id')
      .eq('device_id', event.device_id)
      .eq('is_resolved', false);

    const realtimePayload = {
      device_id: event.device_id,
      latitude: event.latitude,
      longitude: event.longitude,
      location_accuracy: event.location_accuracy,
      noise_level: event.noise_level,
      speed: event.speed,
      active_alerts: (activeAlerts || []).map((item) => ({
        type: item.alert_type,
        severity: item.severity,
        zone_id: item.zone_id,
      })),
      timestamp: event.measured_at,
    };
    emitDashboard('sensor-update', realtimePayload);
    emitDevice(event.device_id, 'sensor-update', realtimePayload);

    return { duplicate: false, stale: false, saved, alerts: alerts.filter(Boolean) };
  }
}

module.exports = new SensorService();
