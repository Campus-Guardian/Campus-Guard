const router = require('express').Router();
const { submitEvent, submitBatch } = require('../controllers/sensorEventController');
const { authenticate } = require('../middleware/auth');
const { requireDeviceAccess } = require('../middleware/deviceAccess');
const { sensorLimiter } = require('../middleware/rateLimits');
const {
  validate,
  sensorEventSchema,
  sensorEventBatchSchema,
} = require('../middleware/validation');
const asyncHandler = require('../middleware/asyncHandler');

router.post(
  '/',
  sensorLimiter,
  authenticate,
  validate(sensorEventSchema),
  requireDeviceAccess,
  asyncHandler(submitEvent)
);
router.post(
  '/batch',
  sensorLimiter,
  authenticate,
  validate(sensorEventBatchSchema),
  requireDeviceAccess,
  asyncHandler(submitBatch)
);

module.exports = router;
