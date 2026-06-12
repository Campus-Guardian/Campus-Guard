require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/socket/socketHandler');
const { startSchedulers, stopSchedulers } = require('./src/services/maintenanceService');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);
startSchedulers();

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║     🛡️  CampusGuard Server Running      ║
  ║     Port: ${PORT}                           ║
  ║     Environment: ${process.env.NODE_ENV || 'development'}            ║
  ╚══════════════════════════════════════════╝
  
  Dashboard: http://localhost:${PORT}/dashboard
  Mobile:    Expo development/internal build
  API:       http://localhost:${PORT}/api
  `);
});

function shutdown() {
  stopSchedulers();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
