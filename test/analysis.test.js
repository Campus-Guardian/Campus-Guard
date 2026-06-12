const test = require('node:test');
const assert = require('node:assert/strict');
const analysis = require('../src/services/analysisService');

test('point in polygon uses campus latitude/longitude pairs', () => {
  const polygon = [[40.0, 29.0], [40.0, 29.1], [40.1, 29.1], [40.1, 29.0]];
  assert.equal(analysis.isPointInPolygon([40.05, 29.05], polygon), true);
  assert.equal(analysis.isPointInPolygon([40.2, 29.05], polygon), false);
});

test('speed alarm requires two accurate consecutive samples', () => {
  const settings = { speed_limit_kmh: 30, max_location_accuracy_m: 25 };
  const previous = {
    speed: 31,
    location_accuracy: 10,
    measured_at: '2026-06-12T00:00:00.000Z',
  };
  const current = {
    speed: 35,
    location_accuracy: 12,
    measured_at: '2026-06-12T00:00:05.000Z',
  };
  assert.equal(analysis.hasSpeedViolation(current, previous, settings), true);
  assert.equal(analysis.hasSpeedViolation({ ...current, location_accuracy: 40 }, previous, settings), false);
  assert.equal(analysis.hasSpeedViolation({ ...current, speed: 29 }, previous, settings), false);
});

test('fall alarm requires free fall followed by impact', () => {
  const impact = {
    acceleration_magnitude: 25,
    measured_at: '2026-06-12T00:00:02.000Z',
  };
  const history = [{
    acceleration_magnitude: 2,
    measured_at: '2026-06-12T00:00:00.500Z',
  }];
  assert.equal(analysis.hasFallImpact(impact, history), true);
  assert.equal(analysis.hasFallImpact(impact, [{ ...history[0], acceleration_magnitude: 9.8 }]), false);
});
