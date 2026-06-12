const supabase = require('../config/supabase');
const analysisService = require('./analysisService');
const alertService = require('./alertService');

function calculateZoneState(previous, isInside, measuredAt, settings) {
  const elapsed = previous?.last_sample_at
    ? new Date(measuredAt) - new Date(previous.last_sample_at)
    : Infinity;
  const consecutive = elapsed >= 0
    && elapsed <= settings.zone_confirmation_window_seconds * 1000;
  const insideCount = isInside ? (consecutive ? (previous?.inside_count || 0) + 1 : 1) : 0;
  const outsideCount = isInside ? 0 : (consecutive ? (previous?.outside_count || 0) + 1 : 1);
  const entered = !previous?.is_inside
    && insideCount >= settings.zone_confirmation_count;
  const exited = Boolean(previous?.is_inside)
    && outsideCount >= settings.zone_confirmation_count;

  return {
    insideCount,
    outsideCount,
    entered,
    exited,
    isInside: exited ? false : Boolean(previous?.is_inside || entered),
  };
}

class ZoneAnalysisService {
  async process(event, zones, settings) {
    if (
      event.latitude == null
      || event.longitude == null
      || event.location_accuracy == null
      || event.location_accuracy > settings.max_location_accuracy_m
    ) return [];

    const results = [];
    for (const zone of zones.filter((item) => item.type !== 'normal')) {
      const isInside = analysisService.isPointInPolygon(
        [event.latitude, event.longitude],
        zone.polygon
      );
      const { data: previous } = await supabase
        .from('device_zone_state')
        .select('*')
        .eq('device_id', event.device_id)
        .eq('zone_id', zone.id)
        .maybeSingle();

      const nextState = calculateZoneState(previous, isInside, event.measured_at, settings);

      await supabase.from('device_zone_state').upsert({
        device_id: event.device_id,
        zone_id: zone.id,
        inside_count: nextState.insideCount,
        outside_count: nextState.outsideCount,
        is_inside: nextState.isInside,
        last_sample_at: event.measured_at,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'device_id,zone_id' });

      const dedupeKey = `zone:${event.device_id}:${zone.id}`;
      if (nextState.entered) {
        const type = zone.type === 'danger' ? 'danger_zone' : 'restricted_zone';
        results.push(await alertService.createOrUpdate({
          dedupe_key: dedupeKey,
          device_id: event.device_id,
          zone_id: zone.id,
          type,
          severity: zone.type === 'danger' ? 'critical' : 'high',
          message: `${zone.name} bolgesine giris algilandi`,
          details: { zone_name: zone.name, accuracy: event.location_accuracy },
          latitude: event.latitude,
          longitude: event.longitude,
        }));
      } else if (nextState.exited) {
        await alertService.resolve(dedupeKey, null, 'zone_exit_confirmed');
      }
    }
    return results.filter(Boolean);
  }
}

module.exports = new ZoneAnalysisService();
module.exports.calculateZoneState = calculateZoneState;
