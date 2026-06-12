const supabase = require('../config/supabase');
const { emitDashboard, emitDevice } = require('../socket/socketHandler');

exports.getAlerts = async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, severity, resolved } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    let query = supabase
      .from('alerts')
      .select('*')
      .order('last_seen', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (type) query = query.eq('alert_type', type);
    if (severity) query = query.eq('severity', severity);
    if (resolved !== undefined) query = query.eq('is_resolved', resolved === 'true');

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data: data || [], count: data ? data.length : 0 });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Alarmlar alinamadi' });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({
        is_resolved: true,
        resolved_by: req.user.id,
        resolved_at: new Date().toISOString(),
        resolution_reason: 'manual',
      })
      .eq('id', req.params.id)
      .eq('is_resolved', false)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Aktif alarm bulunamadi' });

    emitDashboard('alert-resolved', data);
    emitDevice(data.device_id, 'alert-resolved', data);
    return res.json({ message: 'Alarm cozuldu', data });
  } catch (error) {
    console.error('Resolve alert error:', error);
    return res.status(500).json({ error: 'Alarm cozulemedi' });
  }
};

exports.resolveAllAlerts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({
        is_resolved: true,
        resolved_by: req.user.id,
        resolved_at: new Date().toISOString(),
        resolution_reason: 'manual_bulk',
      })
      .eq('is_resolved', false)
      .select();

    if (error) throw error;
    emitDashboard('all-alerts-resolved', { count: data ? data.length : 0 });
    return res.json({ message: 'Tum alarmlar cozuldu', count: data ? data.length : 0 });
  } catch (error) {
    console.error('Resolve all alerts error:', error);
    return res.status(500).json({ error: 'Alarmlar cozulemedi' });
  }
};

exports.getAlertStats = async (req, res) => {
  try {
    const { data: all, error } = await supabase
      .from('alerts')
      .select('alert_type, severity, is_resolved');
    if (error) throw error;

    const alerts = all || [];
    const stats = {
      total: alerts.length,
      active: alerts.filter((alert) => !alert.is_resolved).length,
      resolved: alerts.filter((alert) => alert.is_resolved).length,
      bySeverity: {},
      byType: {},
    };

    for (const alert of alerts) {
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      stats.byType[alert.alert_type] = (stats.byType[alert.alert_type] || 0) + 1;
    }
    res.json(stats);
  } catch (error) {
    console.error('Alert stats error:', error);
    res.status(500).json({ error: 'Istatistikler alinamadi' });
  }
};
