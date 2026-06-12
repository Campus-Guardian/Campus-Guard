const supabase = require('../config/supabase');

exports.upsertPushToken = async (req, res) => {
  const { expo_push_token, device_id, platform } = req.body;

  if (device_id) {
    const { data: device } = await supabase
      .from('devices')
      .select('user_id')
      .eq('id', device_id)
      .maybeSingle();
    if (!device || device.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Push token cihazi bu kullaniciya ait degil' });
    }
  }

  const { data, error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id: req.user.id,
      device_id: device_id || null,
      expo_push_token,
      platform,
      is_active: true,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'expo_push_token' })
    .select('*')
    .single();

  if (error) throw error;
  res.json({ message: 'Push token kaydedildi', data });
};
