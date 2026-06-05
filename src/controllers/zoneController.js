const supabase = require('../config/supabase');

// Bölge listesi
exports.getZones = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Get zones error:', err);
    res.status(500).json({ error: 'Bölgeler alınamadı' });
  }
};

// Bölge ekle (admin)
exports.createZone = async (req, res) => {
  try {
    const { name, type, polygon, max_capacity, color, description } = req.body;
    const { data, error } = await supabase
      .from('zones')
      .insert({
        name,
        type,
        polygon,
        max_capacity: max_capacity || 100,
        color: color || '#3b82f6',
        description: description || null,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Bölge oluşturuldu', zone: data });
  } catch (err) {
    console.error('Create zone error:', err);
    res.status(500).json({ error: 'Bölge oluşturulamadı' });
  }
};

// Bölge güncelle (admin)
exports.updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, polygon, max_capacity, color, description } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (polygon !== undefined) updates.polygon = polygon;
    if (max_capacity !== undefined) updates.max_capacity = max_capacity;
    if (color !== undefined) updates.color = color;
    if (description !== undefined) updates.description = description;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('zones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Bölge güncellendi', zone: data });
  } catch (err) {
    console.error('Update zone error:', err);
    res.status(500).json({ error: 'Bölge güncellenemedi' });
  }
};

// Bölge sil (admin)
exports.deleteZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('zones')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Bölge silindi' });
  } catch (err) {
    console.error('Delete zone error:', err);
    res.status(500).json({ error: 'Bölge silinemedi' });
  }
};
