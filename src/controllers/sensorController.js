const sensorService = require('../services/sensorService');
const supabase = require('../config/supabase');

// Tek sensör verisi gönderimi
exports.submitData = async (req, res) => {
  try {
    const result = await sensorService.processSensorData(req.body);
    res.status(201).json({
      message: 'Veri kaydedildi',
      anomalies: result.anomalies.length,
      alerts: result.anomalies
    });
  } catch (err) {
    console.error('Sensor submit error:', err);
    res.status(500).json({ error: 'Veri kaydedilemedi' });
  }
};

// Toplu veri gönderimi
exports.submitBatch = async (req, res) => {
  try {
    const { device_id, data } = req.body;
    const results = [];
    for (const item of data) {
      const result = await sensorService.processSensorData({ device_id, ...item });
      results.push(result);
    }
    const totalAnomalies = results.reduce((sum, r) => sum + r.anomalies.length, 0);
    res.status(201).json({
      message: `${data.length} veri kaydedildi`,
      totalAnomalies
    });
  } catch (err) {
    console.error('Batch submit error:', err);
    res.status(500).json({ error: 'Toplu veri kaydedilemedi' });
  }
};

// Geçmiş veriler
exports.getHistory = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 100, offset = 0, from, to } = req.query;

    let query = supabase
      .from('sensor_data')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (from) query = query.gte('timestamp', from);
    if (to) query = query.lte('timestamp', to);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data, count: data.length });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Geçmiş veriler alınamadı' });
  }
};
