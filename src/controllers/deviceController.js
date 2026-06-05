const supabase = require('../config/supabase');

// Cihaz kaydı
exports.registerDevice = async (req, res) => {
  try {
    const { device_name, device_type, platform } = req.body;
    const { data, error } = await supabase
      .from('devices')
      .insert({
        user_id: req.user.id,
        device_name,
        device_type: device_type || 'smartphone',
        platform: platform || null
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Cihaz kaydedildi', device: data });
  } catch (err) {
    console.error('Register device error:', err);
    res.status(500).json({ error: 'Cihaz kaydedilemedi' });
  }
};

// Cihaz listesi
exports.getDevices = async (req, res) => {
  try {
    let query = supabase.from('devices').select('*').order('created_at', { ascending: false });
    
    // Normal kullanıcılar sadece kendi cihazlarını görür
    if (req.user.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data });
  } catch (err) {
    console.error('Get devices error:', err);
    res.status(500).json({ error: 'Cihazlar alınamadı' });
  }
};

// Cihaz durumu güncelle
exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { device_name, is_active } = req.body;
    const updates = {};
    if (device_name !== undefined) updates.device_name = device_name;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Cihaz güncellendi', device: data });
  } catch (err) {
    console.error('Update device error:', err);
    res.status(500).json({ error: 'Cihaz güncellenemedi' });
  }
};

// Cihaz sil
exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('devices').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'Cihaz silindi' });
  } catch (err) {
    console.error('Delete device error:', err);
    res.status(500).json({ error: 'Cihaz silinemedi' });
  }
};
