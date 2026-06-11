const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const alertRoutes = require('./routes/alertRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const btuRoutes = require('./routes/btuRoutes');
const simulatorRoutes = require('./routes/simulatorRoutes');
const reportRoutes = require('./routes/reportRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security & parsing middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/dashboard', express.static(path.join(__dirname, '..', 'dashboard')));
app.use('/mobile', express.static(path.join(__dirname, '..', 'mobile')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/btu', btuRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/reports', reportRoutes);

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Error handling
app.use(errorHandler);

module.exports = app;
