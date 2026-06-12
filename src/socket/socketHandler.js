const { Server } = require('socket.io');
const supabase = require('../config/supabase');
const { getUserFromAccessToken } = require('../middleware/auth');

let io = null;

function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

function initSocket(server) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origin is not allowed'));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || readCookie(socket.handshake.headers.cookie, 'cg_access');
      if (!token) return next(new Error('unauthorized'));
      const user = await getUserFromAccessToken(token);
      if (!user) return next(new Error('unauthorized'));
      socket.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user-${socket.user.id}`);
    if (socket.user.role === 'admin') socket.join('dashboard');

    socket.on('join-dashboard', () => {
      if (socket.user.role === 'admin') socket.join('dashboard');
    });

    socket.on('join-device', async (deviceId, callback) => {
      const { data: device } = await supabase
        .from('devices')
        .select('user_id')
        .eq('id', deviceId)
        .maybeSingle();
      const allowed = device
        && (socket.user.role === 'admin' || device.user_id === socket.user.id);
      if (allowed) socket.join(`device-${deviceId}`);
      if (typeof callback === 'function') callback({ ok: Boolean(allowed) });
    });
  });

  return io;
}

function getIO() {
  return io;
}

function emitDashboard(event, payload) {
  if (io) io.to('dashboard').emit(event, payload);
}

function emitUser(userId, event, payload) {
  if (io && userId) io.to(`user-${userId}`).emit(event, payload);
}

function emitDevice(deviceId, event, payload) {
  if (io && deviceId) io.to(`device-${deviceId}`).emit(event, payload);
}

module.exports = {
  initSocket,
  getIO,
  emitDashboard,
  emitUser,
  emitDevice,
};
