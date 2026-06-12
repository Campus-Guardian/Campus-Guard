const supabase = require('../config/supabase');

async function sendExpoMessages(messages) {
  if (messages.length === 0) return [];
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });
  if (!response.ok) throw new Error(`Expo push request failed: ${response.status}`);
  return response.json();
}

async function sendAlertToDeviceOwner(deviceId, alert) {
  if (!deviceId) return;
  const { data: device } = await supabase
    .from('devices')
    .select('user_id')
    .eq('id', deviceId)
    .maybeSingle();
  if (!device?.user_id) return;

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', device.user_id)
    .eq('is_active', true);

  const messages = (tokens || []).map(({ expo_push_token }) => ({
    to: expo_push_token,
    sound: 'default',
    title: alert.alert_type === 'danger_zone'
      ? 'Tehlikeli bolge uyarisi'
      : 'Kisitli bolge uyarisi',
    body: alert.message,
    priority: 'high',
    data: {
      alertId: alert.id,
      alertType: alert.alert_type,
      zoneId: alert.zone_id,
    },
  }));

  try {
    await sendExpoMessages(messages);
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
}

module.exports = { sendAlertToDeviceOwner };
