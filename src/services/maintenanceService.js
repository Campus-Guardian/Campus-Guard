const supabase = require('../config/supabase');
const analysisService = require('./analysisService');
const alertService = require('./alertService');
const noiseCorrelationService = require('./noiseCorrelationService');
const { getAnalysisSettings } = require('./settingsService');

let timers = [];

async function updateCrowdDensity() {
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const [{ data: zones }, { data: devices }] = await Promise.all([
    supabase.from('zones').select('*').eq('is_active', true),
    supabase
      .from('devices')
      .select('id, last_latitude, last_longitude')
      .eq('is_active', true)
      .gte('last_seen', since),
  ]);

  for (const zone of zones || []) {
    const count = (devices || []).filter((device) => (
      device.last_latitude != null
      && device.last_longitude != null
      && analysisService.isPointInPolygon(
        [device.last_latitude, device.last_longitude],
        zone.polygon
      )
    )).length;
    const ratio = zone.max_capacity > 0 ? count / zone.max_capacity : 0;
    const level = ratio >= 0.9 ? 'critical' : ratio >= 0.7 ? 'high' : ratio >= 0.4 ? 'medium' : 'low';

    await supabase.from('crowd_density').insert({
      zone_id: zone.id,
      device_count: count,
      density_level: level,
      capacity_ratio: ratio,
    });

    const dedupeKey = `crowd:${zone.id}`;
    if (ratio >= 0.7) {
      await alertService.createOrUpdate({
        dedupe_key: dedupeKey,
        zone_id: zone.id,
        type: ratio >= 0.9 ? 'crowd_critical' : 'crowd_warning',
        severity: ratio >= 0.9 ? 'critical' : 'high',
        message: `${zone.name} bolgesinde yogunluk %${Math.round(ratio * 100)}`,
        details: { device_count: count, capacity: zone.max_capacity, ratio },
      });
    } else {
      await alertService.resolve(dedupeKey, null, 'crowd_normalized');
    }
  }
}

async function updateHourlySummaries() {
  const hourStart = new Date();
  hourStart.setUTCMinutes(0, 0, 0);
  const [{ data: zones }, { data: sensors }, { data: alerts }] = await Promise.all([
    supabase.from('zones').select('id, polygon').eq('is_active', true),
    supabase
      .from('sensor_data')
      .select('device_id, latitude, longitude, noise_level')
      .gte('measured_at', hourStart.toISOString())
      .limit(10000),
    supabase.from('alerts').select('zone_id').gte('created_at', hourStart.toISOString()),
  ]);

  for (const zone of zones || []) {
    const zoneSensors = (sensors || []).filter((item) => (
      item.latitude != null
      && item.longitude != null
      && analysisService.isPointInPolygon([item.latitude, item.longitude], zone.polygon)
    ));
    const noises = zoneSensors.map((item) => item.noise_level).filter(Number.isFinite);
    await supabase.from('hourly_zone_summaries').upsert({
      zone_id: zone.id,
      hour_start: hourStart.toISOString(),
      unique_devices: new Set(zoneSensors.map((item) => item.device_id)).size,
      average_noise: noises.length ? noises.reduce((sum, value) => sum + value, 0) / noises.length : null,
      max_noise: noises.length ? Math.max(...noises) : null,
      alert_count: (alerts || []).filter((item) => item.zone_id === zone.id).length,
    }, { onConflict: 'zone_id,hour_start' });
  }
}

async function runSafely(name, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`${name} scheduler error:`, err.message);
  }
}

function startSchedulers() {
  if (process.env.ENABLE_SCHEDULERS === 'false' || timers.length > 0) return;
  timers = [
    setInterval(() => runSafely('crowd', updateCrowdDensity), 30000),
    setInterval(() => runSafely('noise', async () => {
      await noiseCorrelationService.resolveStale(await getAnalysisSettings());
    }), 30000),
    setInterval(() => runSafely('summary', updateHourlySummaries), 5 * 60 * 1000),
    setInterval(() => runSafely('retention', () => supabase.rpc('cg_cleanup_retention')), 60 * 60 * 1000),
  ];
  timers.forEach((timer) => timer.unref());
}

function stopSchedulers() {
  timers.forEach(clearInterval);
  timers = [];
}

module.exports = { startSchedulers, stopSchedulers, updateCrowdDensity, updateHourlySummaries };
