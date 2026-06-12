const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { io: createClient } = require('socket.io-client');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-long-enough';

const { initSocket } = require('../src/socket/socketHandler');

test('socket rejects a client without JWT or dashboard cookie', async () => {
  const server = http.createServer();
  const io = initSocket(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const client = createClient(`http://127.0.0.1:${address.port}`, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 2000,
  });

  const message = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Expected socket rejection')), 3000);
    client.on('connect_error', (error) => {
      clearTimeout(timeout);
      resolve(error.message);
    });
  });
  assert.equal(message, 'unauthorized');
  client.close();
  await io.close();
  await new Promise((resolve) => server.close(resolve));
});
