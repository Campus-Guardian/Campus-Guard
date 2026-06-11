const router = require('express').Router();
const { getAlertsCSV, getSensorsCSV, getHourlySummary } = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/alerts/csv', authenticate, requireAdmin, getAlertsCSV);
router.get('/sensors/csv', authenticate, requireAdmin, getSensorsCSV);
router.get('/hourly', authenticate, requireAdmin, getHourlySummary);

module.exports = router;
