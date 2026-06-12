-- Atomic per-device noise counters for concurrent requests and multiple app instances.

CREATE OR REPLACE FUNCTION cg_record_noise_sample(
  p_zone_id UUID,
  p_device_id UUID,
  p_measured_at TIMESTAMPTZ,
  p_is_high BOOLEAN,
  p_window_seconds INTEGER
) RETURNS noise_zone_device_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result noise_zone_device_state;
BEGIN
  INSERT INTO noise_zone_device_state (
    zone_id,
    device_id,
    window_started_at,
    high_reading_count,
    last_high_at,
    updated_at
  ) VALUES (
    p_zone_id,
    p_device_id,
    p_measured_at,
    CASE WHEN p_is_high THEN 1 ELSE 0 END,
    CASE WHEN p_is_high THEN p_measured_at ELSE NULL END,
    NOW()
  )
  ON CONFLICT (zone_id, device_id)
  DO UPDATE SET
    high_reading_count = CASE
      WHEN NOT p_is_high THEN 0
      WHEN p_measured_at - noise_zone_device_state.window_started_at
        > make_interval(secs => p_window_seconds) THEN 1
      ELSE noise_zone_device_state.high_reading_count + 1
    END,
    window_started_at = CASE
      WHEN p_measured_at - noise_zone_device_state.window_started_at
        > make_interval(secs => p_window_seconds) THEN p_measured_at
      ELSE noise_zone_device_state.window_started_at
    END,
    last_high_at = CASE
      WHEN p_is_high THEN GREATEST(
        COALESCE(noise_zone_device_state.last_high_at, p_measured_at),
        p_measured_at
      )
      ELSE noise_zone_device_state.last_high_at
    END,
    updated_at = NOW()
  RETURNING * INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION cg_record_noise_sample(UUID, UUID, TIMESTAMPTZ, BOOLEAN, INTEGER)
  FROM anon, authenticated;
