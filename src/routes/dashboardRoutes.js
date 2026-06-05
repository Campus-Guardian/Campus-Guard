const router = require('express').Router();
const { getStats, getHeatmapData, getTimeSeriesData, getLiveDevices, getZoneDensity } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, getStats);
router.get('/heatmap', authenticate, getHeatmapData);
router.get('/timeseries', authenticate, getTimeSeriesData);
router.get('/live-devices', authenticate, getLiveDevices);
router.get('/zone-density', authenticate, getZoneDensity);

module.exports = router;
