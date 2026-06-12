const crypto = require('crypto');
const sensorService = require('../services/sensorService');
const supabase = require('../config/supabase');

function adaptLegacyEvent(payload) {
  return {
    ...payload,
    event_id: crypto.randomUUID(),
    measured_at: payload.timestamp || new Date().toISOString(),
    app_state: 'foreground',
    location_accuracy: payload.location_accuracy ?? 25,
    noise_peak: payload.noise_level ?? null,
    sample_quality: { source: 'legacy_adapter' },
  };
}

exports.submitData = async (req, res) => {
  try {
    const result = await sensorService.processSensorEvent(adaptLegacyEvent(req.body));
    res.status(result.duplicate ? 200 : 201).json({
      message: result.duplicate ? 'Veri daha once kaydedilmis' : 'Veri kaydedildi',
      duplicate: result.duplicate,
      stale: result.stale,
      anomalies: result.alerts.length,
      alerts: result.alerts,
    });
  } catch (err) {
    console.error('Sensor submit error:', err.message);
    res.status(500).json({ error: 'Veri kaydedilemedi' });
  }
};

exports.submitBatch = async (req, res) => {
  try {
    const results = [];
    for (const item of req.body.data) {
      results.push(await sensorService.processSensorEvent(adaptLegacyEvent({
        device_id: req.body.device_id,
        ...item,
      })));
    }
    res.status(201).json({
      message: `${results.length} veri islendi`,
      duplicates: results.filter((item) => item.duplicate).length,
      stale: results.filter((item) => item.stale).length,
      totalAnomalies: results.reduce((sum, item) => sum + item.alerts.length, 0),
    });
  } catch (err) {
    console.error('Batch submit error:', err.message);
    res.status(500).json({ error: 'Toplu veri kaydedilemedi' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    let query = supabase
      .from('sensor_data')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .order('measured_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (req.query.from) query = query.gte('measured_at', req.query.from);
    if (req.query.to) query = query.lte('measured_at', req.query.to);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ data, count: data.length });
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: 'Gecmis veriler alinamadi' });
  }
};
