const supabase = require('../config/supabase');

// Alarm listesi
exports.getAlerts = async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, severity, resolved } = req.query;

    let query = supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (type) query = query.eq('alert_type', type);
    if (severity) query = query.eq('severity', severity);
    if (resolved !== undefined) query = query.eq('is_resolved', resolved === 'true');

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data, count: data.length });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: 'Alarmlar alınamadı' });
  }
};

// Alarmı çöz
exports.resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('alerts')
      .update({
        is_resolved: true,
        resolved_by: req.user.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Alarm bulunamadı' });

    res.json({ message: 'Alarm çözüldü', data });
  } catch (err) {
    console.error('Resolve alert error:', err);
    res.status(500).json({ error: 'Alarm çözülemedi' });
  }
};

// Alarm istatistikleri
exports.getAlertStats = async (req, res) => {
  try {
    const { data: all } = await supabase.from('alerts').select('alert_type, severity, is_resolved');
    
    const stats = {
      total: all ? all.length : 0,
      active: all ? all.filter(a => !a.is_resolved).length : 0,
      resolved: all ? all.filter(a => a.is_resolved).length : 0,
      bySeverity: {},
      byType: {}
    };

    if (all) {
      all.forEach(a => {
        stats.bySeverity[a.severity] = (stats.bySeverity[a.severity] || 0) + 1;
        stats.byType[a.alert_type] = (stats.byType[a.alert_type] || 0) + 1;
      });
    }

    res.json(stats);
  } catch (err) {
    console.error('Alert stats error:', err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
};
