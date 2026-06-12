const router = require('express').Router();
const { getAlerts, resolveAlert, resolveAllAlerts, getAlertStats, createEmergency, deleteResolvedAlerts } = require('../controllers/alertController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, getAlerts);
router.get('/stats', authenticate, getAlertStats);
router.post('/emergency', authenticate, createEmergency);
router.patch('/resolve-all', authenticate, requireAdmin, resolveAllAlerts);
router.delete('/resolved', authenticate, requireAdmin, deleteResolvedAlerts);
router.patch('/:id/resolve', authenticate, requireAdmin, resolveAlert);

module.exports = router;
