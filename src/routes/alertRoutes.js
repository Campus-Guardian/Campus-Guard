const router = require('express').Router();
const { getAlerts, resolveAlert, resolveAllAlerts, getAlertStats } = require('../controllers/alertController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, requireAdmin, getAlerts);
router.get('/stats', authenticate, requireAdmin, getAlertStats);
router.patch('/resolve-all', authenticate, requireAdmin, resolveAllAlerts);
router.patch('/:id/resolve', authenticate, requireAdmin, resolveAlert);

module.exports = router;
