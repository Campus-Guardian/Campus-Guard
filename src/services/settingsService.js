const supabase = require('../config/supabase');

const DEFAULTS = {
  noise_threshold_db: 85,
  noise_min_devices: 3,
  noise_window_seconds: 30,
  noise_min_readings: 2,
  noise_cooldown_seconds: 120,
  noise_resolve_seconds: 60,
  max_location_accuracy_m: 25,
  zone_confirmation_count: 2,
  zone_confirmation_window_seconds: 15,
  speed_limit_kmh: 30,
  raw_retention_days: 7,
  summary_retention_days: 90,
};

let cached = null;
let cachedAt = 0;

async function getAnalysisSettings(force = false) {
  if (!force && cached && Date.now() - cachedAt < 30000) return cached;
  const { data, error } = await supabase
    .from('analysis_settings')
    .select('*')
    .eq('id', true)
    .maybeSingle();
  if (error) throw error;
  cached = { ...DEFAULTS, ...(data || {}) };
  cachedAt = Date.now();
  return cached;
}

function clearSettingsCache() {
  cached = null;
  cachedAt = 0;
}

module.exports = { DEFAULTS, getAnalysisSettings, clearSettingsCache };
