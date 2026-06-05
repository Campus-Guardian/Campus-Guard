require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/socket/socketHandler');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║     🛡️  CampusGuard Server Running      ║
  ║     Port: ${PORT}                           ║
  ║     Environment: ${process.env.NODE_ENV || 'development'}            ║
  ╚══════════════════════════════════════════╝
  
  Dashboard: http://localhost:${PORT}/dashboard
  Mobile:    http://localhost:${PORT}/mobile
  API:       http://localhost:${PORT}/api
  `);
});
