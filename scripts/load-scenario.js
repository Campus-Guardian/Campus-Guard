// Reproducible 100-device backend load scenario.
const crypto = require('crypto');

const baseUrl = process.env.LOAD_TEST_URL || 'http://127.0.0.1:3000';
const durationSeconds = Number(process.env.LOAD_TEST_SECONDS || 60);
const deviceLimit = Number(process.env.LOAD_TEST_DEVICES || 100);

async function request(path, options = {}) {
  const response = await fetch(baseUrl + path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path}: ${response.status} ${data.error || ''}`);
  return { response, data };
}

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }

  const login = await request('/api/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  const cookie = login.response.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw new Error('Admin cookie was not returned');

  const devicesResult = await request('/api/devices', { headers: { Cookie: cookie } });
  const devices = devicesResult.data.data.slice(0, deviceLimit);
  if (devices.length < deviceLimit) {
    throw new Error(`Expected ${deviceLimit} devices, found ${devices.length}`);
  }

  const endAt = Date.now() + durationSeconds * 1000;
  let sent = 0;
  while (Date.now() < endAt) {
    const measuredAt = new Date().toISOString();
    const startedAt = Date.now();
    await Promise.all(devices.map((device, index) => request('/api/v1/sensor-events', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_id: crypto.randomUUID(),
        device_id: device.id,
        measured_at: measuredAt,
        app_state: 'foreground',
        latitude: 40.1889 + (index % 10) * 0.00001,
        longitude: 29.131 + Math.floor(index / 10) * 0.00001,
        location_accuracy: 5,
        speed: 3,
        noise_level: 55,
        noise_peak: 62,
        acceleration_x: 0,
        acceleration_y: 0,
        acceleration_z: 9.81,
        acceleration_magnitude: 9.81,
        battery_level: 80,
        network_type: 'wifi',
        sample_quality: { source: 'load_test' },
      }),
    })));
    sent += devices.length;
    const wait = Math.max(0, 5000 - (Date.now() - startedAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  }

  console.log(JSON.stringify({
    devices: devices.length,
    durationSeconds,
    eventsSent: sent,
    averagePerSecond: sent / durationSeconds,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
