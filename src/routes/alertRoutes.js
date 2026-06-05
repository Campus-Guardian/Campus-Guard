const router = require('express').Router();
const { getAlerts, resolveAlert, getAlertStats } = require('../controllers/alertController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, getAlerts);
router.get('/stats', authenticate, getAlertStats);
router.patch('/:id/resolve', authenticate, requireAdmin, resolveAlert);

module.exports = router;
