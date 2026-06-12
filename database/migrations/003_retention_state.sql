-- Extend retention cleanup to derived density and transient correlation state.

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
  deleted_alert_rows INTEGER;
BEGIN
  SELECT raw_retention_days, summary_retention_days
  INTO raw_days, summary_days
  FROM analysis_settings WHERE id = true;

  DELETE FROM sensor_data WHERE measured_at < NOW() - make_interval(days => raw_days);
  GET DIAGNOSTICS deleted_sensor_rows = ROW_COUNT;

  DELETE FROM hourly_zone_summaries
  WHERE hour_start < NOW() - make_interval(days => summary_days);
  GET DIAGNOSTICS deleted_summary_rows = ROW_COUNT;

  DELETE FROM alerts
  WHERE is_resolved = true
    AND COALESCE(resolved_at, last_seen, created_at)
      < NOW() - make_interval(days => summary_days);
  GET DIAGNOSTICS deleted_alert_rows = ROW_COUNT;

  DELETE FROM crowd_density
  WHERE timestamp < NOW() - make_interval(days => summary_days);
  DELETE FROM noise_zone_device_state
  WHERE updated_at < NOW() - INTERVAL '1 day';
  DELETE FROM device_zone_state
  WHERE updated_at < NOW() - INTERVAL '7 days';
  DELETE FROM auth_sessions
  WHERE expires_at < NOW() - INTERVAL '1 day';

  RETURN jsonb_build_object(
    'sensor_rows', deleted_sensor_rows,
    'summary_rows', deleted_summary_rows,
    'alert_rows', deleted_alert_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION cg_cleanup_retention() FROM anon, authenticated;
