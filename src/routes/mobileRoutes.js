const router = require('express').Router();
const { upsertPushToken } = require('../controllers/mobileController');
const { authenticate } = require('../middleware/auth');
const { validate, pushTokenSchema } = require('../middleware/validation');
const asyncHandler = require('../middleware/asyncHandler');

router.put('/push-token', authenticate, validate(pushTokenSchema), asyncHandler(upsertPushToken));

module.exports = router;
