const test = require('node:test');
const assert = require('node:assert/strict');
const {
  registerSchema,
  sensorEventSchema,
  sensorEventBatchSchema,
} = require('../src/middleware/validation');

const event = {
  event_id: '11111111-1111-4111-8111-111111111111',
  device_id: '22222222-2222-4222-8222-222222222222',
  measured_at: new Date().toISOString(),
  app_state: 'background',
  latitude: 40.1889,
  longitude: 29.131,
  location_accuracy: 8,
  noise_level: 86,
  noise_peak: 91,
};

test('SensorEvent accepts the V1 contract', () => {
  assert.equal(sensorEventSchema.validate(event).error, undefined);
});

test('batch rejects more than 100 events and per-item device spoofing', () => {
  const batchEvent = { ...event };
  delete batchEvent.device_id;
  assert.ok(sensorEventBatchSchema.validate({
    device_id: event.device_id,
    events: Array.from({ length: 101 }, () => batchEvent),
  }).error);
  assert.ok(sensorEventBatchSchema.validate({
    device_id: event.device_id,
    events: [event],
  }).error);
});

test('registration requires a strong password and one-time ticket', () => {
  assert.ok(registerSchema.validate({ student_id: '220000001', password: 'weak' }).error);
  assert.equal(registerSchema.validate({
    student_id: '220000001',
    password: 'a-secure-password',
    registration_ticket: 'x'.repeat(64),
  }).error, undefined);
});
