-- CampusGuard secure realtime v1 migration.
-- Run after database/schema.sql for an existing installation.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE sensor_data
  ADD COLUMN IF NOT EXISTS event_id UUID,
  ADD COLUMN IF NOT EXISTS measured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS app_state VARCHAR(20) DEFAULT 'foreground',
  ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS noise_peak DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS sample_quality JSONB DEFAULT '{}'::jsonb;

UPDATE sensor_data SET event_id = gen_random_uuid() WHERE event_id IS NULL;
UPDATE sensor_data SET measured_at = timestamp WHERE measured_at IS NULL;
ALTER TABLE sensor_data ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE sensor_data ALTER COLUMN measured_at SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sensor_data_event_id ON sensor_data(event_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_measured_at ON sensor_data(measured_at DESC);

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
  ADD COLUMN IF NOT EXISTS first_seen TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS occurrence_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS resolution_reason TEXT;

UPDATE alerts
SET dedupe_key = COALESCE(dedupe_key, id::text),
    first_seen = COALESCE(first_seen, created_at),
    last_seen = COALESCE(last_seen, created_at),
    occurrence_count = COALESCE(occurrence_count, 1);

ALTER TABLE alerts ALTER COLUMN dedupe_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_active_dedupe
  ON alerts(dedupe_key) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_alerts_last_seen ON alerts(last_seen DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_type VARCHAR(30) NOT NULL CHECK (session_type IN ('registration', 'refresh')),
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id, session_type);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  expo_push_token TEXT UNIQUE NOT NULL,
  platform VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id, is_active);

CREATE TABLE IF NOT EXISTS analysis_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  noise_threshold_db DOUBLE PRECISION NOT NULL DEFAULT 85,
  noise_min_devices INTEGER NOT NULL DEFAULT 3,
  noise_window_seconds INTEGER NOT NULL DEFAULT 30,
  noise_min_readings INTEGER NOT NULL DEFAULT 2,
  noise_cooldown_seconds INTEGER NOT NULL DEFAULT 120,
  noise_resolve_seconds INTEGER NOT NULL DEFAULT 60,
  max_location_accuracy_m DOUBLE PRECISION NOT NULL DEFAULT 25,
  zone_confirmation_count INTEGER NOT NULL DEFAULT 2,
  zone_confirmation_window_seconds INTEGER NOT NULL DEFAULT 15,
  speed_limit_kmh DOUBLE PRECISION NOT NULL DEFAULT 30,
  raw_retention_days INTEGER NOT NULL DEFAULT 7,
  summary_retention_days INTEGER NOT NULL DEFAULT 90,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO analysis_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS device_zone_state (
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  inside_count INTEGER DEFAULT 0,
  outside_count INTEGER DEFAULT 0,
  is_inside BOOLEAN DEFAULT false,
  last_sample_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (device_id, zone_id)
);

CREATE TABLE IF NOT EXISTS noise_zone_device_state (
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  window_started_at TIMESTAMPTZ NOT NULL,
  high_reading_count INTEGER DEFAULT 0,
  last_high_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (zone_id, device_id)
);
CREATE INDEX IF NOT EXISTS idx_noise_state_zone_last
  ON noise_zone_device_state(zone_id, last_high_at DESC);

CREATE TABLE IF NOT EXISTS hourly_zone_summaries (
  id BIGSERIAL PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  hour_start TIMESTAMPTZ NOT NULL,
  unique_devices INTEGER DEFAULT 0,
  average_noise DOUBLE PRECISION,
  max_noise DOUBLE PRECISION,
  alert_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zone_id, hour_start)
);

CREATE OR REPLACE FUNCTION cg_upsert_active_alert(
  p_dedupe_key TEXT,
  p_device_id UUID,
  p_zone_id UUID,
  p_alert_type VARCHAR,
  p_severity VARCHAR,
  p_message TEXT,
  p_details JSONB,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
) RETURNS alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result alerts;
BEGIN
  INSERT INTO alerts (
    dedupe_key, device_id, zone_id, alert_type, severity, message, details,
    latitude, longitude, first_seen, last_seen, occurrence_count, is_resolved
  ) VALUES (
    p_dedupe_key, p_device_id, p_zone_id, p_alert_type, p_severity, p_message,
    p_details, p_latitude, p_longitude, NOW(), NOW(), 1, false
  )
  ON CONFLICT (dedupe_key) WHERE is_resolved = false
  DO UPDATE SET
    severity = EXCLUDED.severity,
    message = EXCLUDED.message,
    details = EXCLUDED.details,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    last_seen = NOW(),
    created_at = NOW(),
    occurrence_count = alerts.occurrence_count + 1
  RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION cg_resolve_alert(
  p_dedupe_key TEXT,
  p_resolved_by UUID,
  p_reason TEXT
) RETURNS alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result alerts;
BEGIN
  UPDATE alerts
  SET is_resolved = true,
      resolved_by = p_resolved_by,
      resolved_at = NOW(),
      resolution_reason = p_reason
  WHERE dedupe_key = p_dedupe_key AND is_resolved = false
  RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION cg_cleanup_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_days INTEGER;
  summary_days INTEGER;
  deleted_sensor_rows INTEGER;
  deleted_summary_rows INTEGER;
BEGIN
  SELECT raw_retention_days, summary_retention_days
  INTO raw_days, summary_days
  FROM analysis_settings WHERE id = true;

  DELETE FROM sensor_data WHERE measured_at < NOW() - make_interval(days => raw_days);
  GET DIAGNOSTICS deleted_sensor_rows = ROW_COUNT;

  DELETE FROM hourly_zone_summaries WHERE hour_start < NOW() - make_interval(days => summary_days);
  GET DIAGNOSTICS deleted_summary_rows = ROW_COUNT;

  DELETE FROM alerts WHERE created_at < NOW() - make_interval(days => summary_days);
  DELETE FROM auth_sessions WHERE expires_at < NOW() - INTERVAL '1 day';

  RETURN jsonb_build_object(
    'sensor_rows', deleted_sensor_rows,
    'summary_rows', deleted_summary_rows
  );
END;
$$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_density ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_zone_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE noise_zone_device_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_zone_summaries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
