const router = require('express').Router();
const { generateTestData, cleanupTestData } = require('../controllers/simulatorController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.post('/generate', authenticate, requireAdmin, generateTestData);
router.delete('/cleanup', authenticate, requireAdmin, cleanupTestData);

module.exports = router;
