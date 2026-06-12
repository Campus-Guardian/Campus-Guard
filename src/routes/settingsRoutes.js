const router = require('express').Router();
const {
  getAnalysisSettings,
  updateAnalysisSettings,
} = require('../controllers/settingsController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, analysisSettingsSchema } = require('../middleware/validation');

router.use(authenticate, requireAdmin);
router.get('/analysis', getAnalysisSettings);
router.patch('/analysis', validate(analysisSettingsSchema), updateAnalysisSettings);

module.exports = router;
