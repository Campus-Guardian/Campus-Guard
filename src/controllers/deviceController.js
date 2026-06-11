const supabase = require('../config/supabase');

// Cihaz kaydı
exports.registerDevice = async (req, res) => {
  try {
    const { student_id, device_name, device_type, platform } = req.body;

    let targetUserId = req.user.id;
    if (req.user.role === 'admin' && student_id) {
      const { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('student_id', student_id)
        .single();

      if (userError || !targetUser) {
        return res.status(404).json({ error: 'Bu öğrenci numarasına ait bir kullanıcı bulunamadı. Lütfen önce öğrencinin üye olduğundan emin olun.' });
      }
      targetUserId = targetUser.id;
    }

    const { data, error } = await supabase
      .from('devices')
      .insert({
        user_id: targetUserId,
        device_name: device_name || student_id,
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
    let selectString = '*';
    if (req.user.role === 'admin') {
      selectString = '*, users(student_id, full_name)';
    }

    let query = supabase.from('devices').select(selectString).order('created_at', { ascending: false });
    
    // Normal kullanıcılar sadece kendi cihazlarını görür
    if (req.user.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Flatten user info for easier consumption by the client
    const enrichedData = data.map(d => {
      const u = d.users;
      delete d.users;
      return {
        ...d,
        student_id: u ? u.student_id : null,
        user_name: u ? u.full_name : null
      };
    });

    res.json({ data: enrichedData });
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

    // Test kullanıcısına aitse kullanıcıyı sil (böylece cascade silme tetiklenir)
    const { data: device } = await supabase
      .from('devices')
      .select('user_id')
      .eq('id', id)
      .single();

    if (device && device.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('student_id')
        .eq('id', device.user_id)
        .single();

      if (user && user.student_id && user.student_id.startsWith('TEST')) {
        const { error: userDelError } = await supabase
          .from('users')
          .delete()
          .eq('id', device.user_id);
        if (userDelError) throw userDelError;
        return res.json({ message: 'Test cihazı ve kullanıcısı başarıyla silindi' });
      }
    }

    const { error } = await supabase.from('devices').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'Cihaz silindi' });
  } catch (err) {
    console.error('Delete device error:', err);
    res.status(500).json({ error: 'Cihaz silinemedi' });
  }
};
