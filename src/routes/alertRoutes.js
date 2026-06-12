const router = require('express').Router();
const { getAlerts, resolveAlert, resolveAllAlerts, getAlertStats, createEmergency } = require('../controllers/alertController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, getAlerts);
router.get('/stats', authenticate, getAlertStats);
router.post('/emergency', authenticate, createEmergency);
router.patch('/resolve-all', authenticate, requireAdmin, resolveAllAlerts);
router.patch('/:id/resolve', authenticate, requireAdmin, resolveAlert);

module.exports = router;
