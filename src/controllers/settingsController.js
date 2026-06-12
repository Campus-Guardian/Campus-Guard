const supabase = require('../config/supabase');
const { clearSettingsCache } = require('../services/settingsService');

exports.getAnalysisSettings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('analysis_settings')
      .select('*')
      .eq('id', true)
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error('Get analysis settings error:', error);
    res.status(500).json({ error: 'Analiz ayarlari alinamadi' });
  }
};

exports.updateAnalysisSettings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('analysis_settings')
      .update({
        ...req.body,
        updated_by: req.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', true)
      .select('*')
      .single();
    if (error) throw error;
    clearSettingsCache();
    res.json({ message: 'Analiz ayarlari guncellendi', data });
  } catch (error) {
    console.error('Update analysis settings error:', error);
    res.status(500).json({ error: 'Analiz ayarlari guncellenemedi' });
  }
};
