const { Server } = require('socket.io');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Cihaz odalarına katılma
    socket.on('join-device', (deviceId) => {
      socket.join(`device-${deviceId}`);
      console.log(`[Socket] ${socket.id} joined device-${deviceId}`);
    });

    // Dashboard odası
    socket.on('join-dashboard', () => {
      socket.join('dashboard');
      console.log(`[Socket] ${socket.id} joined dashboard`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket] Socket.io initialized');
  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
