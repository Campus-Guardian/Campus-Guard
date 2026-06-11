const supabase = require('../config/supabase');

// Helper function to escape CSV values
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
}

// Helper to convert array of objects to CSV
function jsonToCSV(headers, keys, data) {
  const headerRow = headers.join(',') + '\n';
  const rows = data.map(row => {
    return keys.map(key => {
      // Handle nested details properties if key has a dot
      if (key.includes('.')) {
        const parts = key.split('.');
        const parent = row[parts[0]] || {};
        return escapeCSV(parent[parts[1]]);
      }
      return escapeCSV(row[key]);
    }).join(',');
  }).join('\n');
  return headerRow + rows;
}

// 1. Download alerts as CSV
exports.getAlertsCSV = async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = supabase.from('alerts').select('*').order('created_at', { ascending: false });

    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data: alerts, error } = await query;
    if (error) throw error;

    const headers = [
      'Alarm ID', 
      'Cihaz ID', 
      'Cihaz Adı', 
      'Öğrenci No', 
      'Öğrenci Adı', 
      'Alarm Tipi', 
      'Önem Seviyesi', 
      'Mesaj', 
      'Enlem (Lat)', 
      'Boylam (Lng)', 
      'Çözüldü mü', 
      'Oluşturulma Tarihi'
    ];
    
    const keys = [
      'id', 
      'device_id', 
      'details.device_name', 
      'details.student_id', 
      'details.user_name', 
      'alert_type', 
      'severity', 
      'message', 
      'latitude', 
      'longitude', 
      'is_resolved', 
      'created_at'
    ];

    const csvContent = jsonToCSV(headers, keys, alerts || []);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="alerts_report.csv"');
    res.status(200).send('\uFEFF' + csvContent); // Add UTF-8 BOM for Excel Turkish character support
  } catch (err) {
    console.error('Alerts CSV generation error:', err);
    res.status(500).json({ error: 'Alarm CSV raporu oluşturulamadı' });
  }
};

// 2. Download sensor data as CSV
exports.getSensorsCSV = async (req, res) => {
  try {
    const { from, to, device_id } = req.query;
    let query = supabase.from('sensor_data').select('*').order('timestamp', { ascending: false });

    if (device_id) query = query.eq('device_id', device_id);
    if (from) query = query.gte('timestamp', from);
    if (to) query = query.lte('timestamp', to);

    const { data: sensorData, error } = await query;
    if (error) throw error;

    const headers = [
      'Kayıt ID', 
      'Cihaz ID', 
      'Tarih/Saat', 
      'Enlem (Lat)', 
      'Boylam (Lng)', 
      'Gürültü Seviyesi (dB)', 
      'İvme X', 
      'İvme Y', 
      'İvme Z', 
      'Hız (km/h)', 
      'Batarya Seviyesi (%)', 
      'Ağ Tipi'
    ];
    
    const keys = [
      'id', 
      'device_id', 
      'timestamp', 
      'latitude', 
      'longitude', 
      'noise_level', 
      'acceleration_x', 
      'acceleration_y', 
      'acceleration_z', 
      'speed', 
      'battery_level', 
      'network_type'
    ];

    const csvContent = jsonToCSV(headers, keys, sensorData || []);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sensors_report.csv"');
    res.status(200).send('\uFEFF' + csvContent); // Add UTF-8 BOM
  } catch (err) {
    console.error('Sensors CSV generation error:', err);
    res.status(500).json({ error: 'Sensör veri CSV raporu oluşturulamadı' });
  }
};

// 3. Hourly Summary for past 24 hours (JSON summary)
exports.getHourlySummary = async (req, res) => {
  try {
    const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch alerts and sensor data from past 24 hours
    const [alertsRes, sensorsRes] = await Promise.all([
      supabase.from('alerts').select('created_at').gte('created_at', past24Hours),
      supabase.from('sensor_data').select('timestamp, noise_level, device_id').gte('timestamp', past24Hours)
    ]);

    if (alertsRes.error) throw alertsRes.error;
    if (sensorsRes.error) throw sensorsRes.error;

    const alerts = alertsRes.data || [];
    const sensors = sensorsRes.data || [];

    // Initialize 24 hourly buckets
    const hourlySummary = [];
    for (let i = 23; i >= 0; i--) {
      const timeLimit = new Date(Date.now() - i * 60 * 60 * 1000);
      const hourStr = `${String(timeLimit.getHours()).padStart(2, '0')}:00`;
      
      const startOfHour = new Date(timeLimit);
      startOfHour.setMinutes(0, 0, 0);
      const endOfHour = new Date(timeLimit);
      endOfHour.setMinutes(59, 59, 999);

      // Filter data in this hour bucket
      const hourAlerts = alerts.filter(a => {
        const d = new Date(a.created_at);
        return d >= startOfHour && d <= endOfHour;
      });

      const hourSensors = sensors.filter(s => {
        const d = new Date(s.timestamp);
        return d >= startOfHour && d <= endOfHour;
      });

      const noises = hourSensors.map(s => s.noise_level).filter(n => n != null);
      const avgNoise = noises.length > 0 ? parseFloat((noises.reduce((a, b) => a + b, 0) / noises.length).toFixed(1)) : 0;
      
      const devices = [...new Set(hourSensors.map(s => s.device_id))];

      hourlySummary.push({
        hour: hourStr,
        alertsCount: hourAlerts.length,
        avgNoise: avgNoise,
        activeDevicesCount: devices.length
      });
    }

    res.json({ data: hourlySummary });
  } catch (err) {
    console.error('Hourly summary error:', err);
    res.status(500).json({ error: 'Saatlik özet raporu alınamadı' });
  }
};
