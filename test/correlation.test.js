const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role';

const { calculateZoneState } = require('../src/services/zoneAnalysisService');
const { countQualifiedDevices } = require('../src/services/noiseCorrelationService');

const settings = {
  zone_confirmation_count: 2,
  zone_confirmation_window_seconds: 15,
};

test('zone entry and exit each require two consecutive samples', () => {
  const firstInside = calculateZoneState(null, true, '2026-06-12T00:00:00Z', settings);
  assert.equal(firstInside.entered, false);

  const secondInside = calculateZoneState({
    inside_count: firstInside.insideCount,
    outside_count: 0,
    is_inside: false,
    last_sample_at: '2026-06-12T00:00:00Z',
  }, true, '2026-06-12T00:00:05Z', settings);
  assert.equal(secondInside.entered, true);
  assert.equal(secondInside.isInside, true);

  const firstOutside = calculateZoneState({
    inside_count: secondInside.insideCount,
    outside_count: 0,
    is_inside: true,
    last_sample_at: '2026-06-12T00:00:05Z',
  }, false, '2026-06-12T00:00:10Z', settings);
  assert.equal(firstOutside.exited, false);

  const secondOutside = calculateZoneState({
    inside_count: 0,
    outside_count: firstOutside.outsideCount,
    is_inside: true,
    last_sample_at: '2026-06-12T00:00:10Z',
  }, false, '2026-06-12T00:00:15Z', settings);
  assert.equal(secondOutside.exited, true);
  assert.equal(secondOutside.isInside, false);
});

test('noise quorum counts unique devices, not readings', () => {
  assert.equal(countQualifiedDevices([
    { device_id: 'a' },
    { device_id: 'a' },
    { device_id: 'b' },
  ]), 2);
  assert.equal(countQualifiedDevices([
    { device_id: 'a' },
    { device_id: 'b' },
    { device_id: 'c' },
  ]), 3);
});
