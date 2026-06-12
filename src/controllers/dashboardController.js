const supabase = require('../config/supabase');

// Genel istatistikler
exports.getStats = async (req, res) => {
  try {
    const [devicesRes, alertsRes, zonesRes, activeAlertsRes] = await Promise.all([
      supabase.from('devices').select('id, is_active'),
      supabase.from('alerts').select('id'),
      supabase.from('zones').select('id').eq('is_active', true),
      supabase.from('alerts').select('id, severity').eq('is_resolved', false)
    ]);

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: onlineDevices } = await supabase
      .from('devices')
      .select('id')
      .eq('is_active', true)
      .gte('last_seen', fiveMinAgo);

    res.json({
      totalDevices: devicesRes.data ? devicesRes.data.length : 0,
      onlineDevices: onlineDevices ? onlineDevices.length : 0,
      totalAlerts: alertsRes.data ? alertsRes.data.length : 0,
      activeAlerts: activeAlertsRes.data ? activeAlertsRes.data.length : 0,
      criticalAlerts: activeAlertsRes.data ? activeAlertsRes.data.filter(a => a.severity === 'critical').length : 0,
      totalZones: zonesRes.data ? zonesRes.data.length : 0
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
};

// Heatmap verisi (aktif cihaz konumları)
exports.getHeatmapData = async (req, res) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('devices')
      .select('id, device_name, last_latitude, last_longitude, last_seen')
      .eq('is_active', true)
      .gte('last_seen', fiveMinAgo)
      .not('last_latitude', 'is', null);

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error('Heatmap error:', err);
    res.status(500).json({ error: 'Heatmap verisi alınamadı' });
  }
};

// Son sensör verileri (zaman serisi grafikleri için)
exports.getTimeSeriesData = async (req, res) => {
  try {
    const { hours = 1, device_id } = req.query;
    const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('sensor_data')
      .select('timestamp, noise_level, acceleration_magnitude, speed, latitude, longitude, device_id')
      .gte('timestamp', since)
      .order('timestamp', { ascending: true })
      .limit(500);

    if (device_id) query = query.eq('device_id', device_id);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data: data || [] });
  } catch (err) {
    console.error('Time series error:', err);
    res.status(500).json({ error: 'Zaman serisi verisi alınamadı' });
  }
};

// Aktif cihazlar (harita için) — öğrenci numarası ve aktif alarm bilgisi ile
exports.getLiveDevices = async (req, res) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: devices, error } = await supabase
      .from('devices')
      .select('id, device_name, last_latitude, last_longitude, last_seen, device_type, user_id')
      .eq('is_active', true)
      .gte('last_seen', fiveMinAgo);

    if (error) throw error;
    if (!devices || devices.length === 0) return res.json({ data: [] });

    // Öğrenci bilgisi çek
    const userIds = [...new Set(devices.filter(d => d.user_id).map(d => d.user_id))];
    const deviceIds = devices.map(d => d.id);

    let usersMap = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, student_id, full_name, email')
        .in('id', userIds);
      if (users) {
        users.forEach(u => { usersMap[u.id] = u; });
      }
    }

    // Aktif alarmlar (cihaz bazlı)
    const { data: activeAlerts } = await supabase
      .from('alerts')
      .select('device_id, alert_type, severity')
      .eq('is_resolved', false)
      .in('device_id', deviceIds);

    const alertMap = {};
    if (activeAlerts) {
      activeAlerts.forEach(a => {
        if (!alertMap[a.device_id]) alertMap[a.device_id] = [];
        alertMap[a.device_id].push({ type: a.alert_type, severity: a.severity });
      });
    }

    // Acil durum alarmları — UUID veya email üzerinden eşleştir
    const { data: emergencyAlerts } = await supabase
      .from('alerts')
      .select('details, alert_type')
      .eq('is_resolved', false)
      .in('alert_type', ['emergency_health', 'emergency_security']);

    // user_id (UUID) → emergency_type haritası
    // Eski kayıtlardaki email tabanlı details.user_id için de email → UUID çevirisi yap
    const emailToUserId = {};
    Object.values(usersMap).forEach(u => {
      if (u.email) emailToUserId[u.email] = u.id;
      if (u.student_id) emailToUserId[u.student_id] = u.id;
    });

    const emergencyUserMap = {};
    if (emergencyAlerts) {
      emergencyAlerts.forEach(a => {
        const raw = a.details && a.details.user_id;
        if (!raw) return;
        // UUID ise doğrudan kullan, email/student_id ise çevir
        const uid = emailToUserId[raw] || raw;
        emergencyUserMap[uid] = a.alert_type;
      });
    }

    const enrichedDevices = devices.map(d => ({
      ...d,
      student_id: d.user_id && usersMap[d.user_id] ? usersMap[d.user_id].student_id : null,
      user_name: d.user_id && usersMap[d.user_id] ? usersMap[d.user_id].full_name : null,
      active_alerts: alertMap[d.id] || [],
      // Acil durum bayrağı: bu kullanıcının açık acil alarm var mı?
      emergency_type: d.user_id ? (emergencyUserMap[d.user_id] || null) : null
    }));

    res.json({ data: enrichedDevices });
  } catch (err) {
    console.error('Live devices error:', err);
    res.status(500).json({ error: 'Aktif cihazlar alınamadı' });
  }
};


// Bölge yoğunlukları
exports.getZoneDensity = async (req, res) => {
  try {
    const { data: zones } = await supabase.from('zones').select('*').eq('is_active', true);
    if (!zones) return res.json({ data: [] });

    const result = [];
    for (const zone of zones) {
      const { data: density } = await supabase
        .from('crowd_density')
        .select('*')
        .eq('zone_id', zone.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      result.push({
        zone,
        density: density || { device_count: 0, density_level: 'low', capacity_ratio: 0 }
      });
    }

    res.json({ data: result });
  } catch (err) {
    console.error('Zone density error:', err);
    res.status(500).json({ error: 'Yoğunluk verisi alınamadı' });
  }
};
