const router = require('express').Router();
const { getStats, getHeatmapData, getTimeSeriesData, getLiveDevices, getZoneDensity } = require('../controllers/dashboardController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);
router.get('/stats', getStats);
router.get('/heatmap', getHeatmapData);
router.get('/timeseries', getTimeSeriesData);
router.get('/live-devices', getLiveDevices);
router.get('/zone-density', getZoneDensity);

module.exports = router;
