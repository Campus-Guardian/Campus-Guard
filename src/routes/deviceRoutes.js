const router = require('express').Router();
const { registerDevice, getDevices, updateDevice, deleteDevice } = require('../controllers/deviceController');
const { authenticate } = require('../middleware/auth');
const { validate, deviceSchema } = require('../middleware/validation');

router.post('/register', authenticate, validate(deviceSchema), registerDevice);
router.get('/', authenticate, getDevices);
router.patch('/:id', authenticate, updateDevice);
router.delete('/:id', authenticate, deleteDevice);

module.exports = router;
