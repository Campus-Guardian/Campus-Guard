const router = require('express').Router();
const { registerDevice, getDevices, updateDevice, deleteDevice } = require('../controllers/deviceController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { requireDeviceAccess } = require('../middleware/deviceAccess');
const { validate, deviceSchema, deviceUpdateSchema } = require('../middleware/validation');

router.post('/register', authenticate, validate(deviceSchema), registerDevice);
router.get('/', authenticate, getDevices);
router.patch('/:id', authenticate, requireDeviceAccess, validate(deviceUpdateSchema), updateDevice);
router.delete('/:id', authenticate, requireAdmin, deleteDevice);

module.exports = router;
