const router = require('express').Router();
const { getZones, createZone, updateZone, deleteZone } = require('../controllers/zoneController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, zoneSchema } = require('../middleware/validation');

router.get('/', authenticate, getZones);
router.post('/', authenticate, requireAdmin, validate(zoneSchema), createZone);
router.patch('/:id', authenticate, requireAdmin, updateZone);
router.delete('/:id', authenticate, requireAdmin, deleteZone);

module.exports = router;
