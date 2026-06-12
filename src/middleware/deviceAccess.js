const supabase = require('../config/supabase');

function getDeviceId(req) {
  return req.params.deviceId || req.params.id || req.body.device_id;
}

async function requireDeviceAccess(req, res, next) {
  try {
    const deviceId = getDeviceId(req);
    if (!deviceId) return res.status(400).json({ error: 'Cihaz kimligi gerekli' });

    const { data: device, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .maybeSingle();

    if (error || !device) return res.status(404).json({ error: 'Cihaz bulunamadi' });
    if (req.user.role !== 'admin' && device.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Bu cihaza erisim yetkiniz yok' });
    }

    req.device = device;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireDeviceAccess };
