const supabase = require('../config/supabase');
const { emitDashboard, emitUser, emitDevice } = require('../socket/socketHandler');
const { sendAlertToDeviceOwner } = require('./pushService');

async function enrichDetails(alertData) {
  const details = { ...(alertData.details || {}) };
  if (!alertData.device_id) return details;

  const { data: device } = await supabase
    .from('devices')
    .select('device_name, user_id')
    .eq('id', alertData.device_id)
    .maybeSingle();
  if (!device) return details;
  details.device_name = device.device_name;

  if (device.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('student_id, full_name')
      .eq('id', device.user_id)
      .maybeSingle();
    if (user) {
      details.student_id = user.student_id;
      details.user_name = user.full_name;
      details.user_id = device.user_id;
    }
  }
  return details;
}

class AlertService {
  async createOrUpdate(alertData) {
    const details = await enrichDetails(alertData);
    const { data, error } = await supabase.rpc('cg_upsert_active_alert', {
      p_dedupe_key: alertData.dedupe_key,
      p_device_id: alertData.device_id || null,
      p_zone_id: alertData.zone_id || null,
      p_alert_type: alertData.type,
      p_severity: alertData.severity,
      p_message: alertData.message,
      p_details: Object.keys(details).length > 0 ? details : null,
      p_latitude: alertData.latitude ?? null,
      p_longitude: alertData.longitude ?? null,
    });
    if (error) throw error;

    const eventName = data.occurrence_count === 1 ? 'new-alert' : 'alert-updated';
    emitDashboard(eventName, data);
    emitDevice(data.device_id, eventName, data);
    if (details.user_id) emitUser(details.user_id, eventName, data);

    if (
      data.occurrence_count === 1
      && (data.alert_type === 'danger_zone' || data.alert_type === 'restricted_zone')
    ) {
      await sendAlertToDeviceOwner(data.device_id, data);
    }
    return data;
  }

  async resolve(dedupeKey, resolvedBy = null, reason = 'condition_cleared') {
    const { data, error } = await supabase.rpc('cg_resolve_alert', {
      p_dedupe_key: dedupeKey,
      p_resolved_by: resolvedBy,
      p_reason: reason,
    });
    if (error) throw error;
    if (!data) return null;
    emitDashboard('alert-resolved', data);
    emitDevice(data.device_id, 'alert-resolved', data);
    return data;
  }
}

module.exports = new AlertService();
