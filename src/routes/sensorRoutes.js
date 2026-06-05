const router = require('express').Router();
const { submitData, submitBatch, getHistory } = require('../controllers/sensorController');
const { authenticate } = require('../middleware/auth');
const { validate, sensorDataSchema, sensorBatchSchema } = require('../middleware/validation');

router.post('/data', authenticate, validate(sensorDataSchema), submitData);
router.post('/batch', authenticate, validate(sensorBatchSchema), submitBatch);
router.get('/history/:deviceId', authenticate, getHistory);

module.exports = router;
