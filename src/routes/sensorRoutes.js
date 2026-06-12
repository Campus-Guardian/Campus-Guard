const router = require('express').Router();
const { submitData, submitBatch, getHistory } = require('../controllers/sensorController');
const { authenticate } = require('../middleware/auth');
const { requireDeviceAccess } = require('../middleware/deviceAccess');
const { sensorLimiter } = require('../middleware/rateLimits');
const { validate, sensorDataSchema, sensorBatchSchema } = require('../middleware/validation');

router.post('/data', sensorLimiter, authenticate, validate(sensorDataSchema), requireDeviceAccess, submitData);
router.post('/batch', sensorLimiter, authenticate, validate(sensorBatchSchema), requireDeviceAccess, submitBatch);
router.get('/history/:deviceId', authenticate, requireDeviceAccess, getHistory);

module.exports = router;
