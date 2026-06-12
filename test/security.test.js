const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-long-enough';
process.env.ENABLE_SCHEDULERS = 'false';

const app = require('../src/app');

test('health endpoint is public', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('campus-wide and device endpoints reject anonymous users', async () => {
  const dashboard = await request(app).get('/api/dashboard/live-devices');
  const devices = await request(app).get('/api/devices');
  const alerts = await request(app).get('/api/alerts');
  assert.equal(dashboard.status, 401);
  assert.equal(devices.status, 401);
  assert.equal(alerts.status, 401);
});
