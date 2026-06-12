const router = require('express').Router();
const { getCaptcha, verifyStudent } = require('../controllers/btuController');
const { captchaLimiter } = require('../middleware/rateLimits');

// CAPTCHA görselini al
router.get('/captcha', captchaLimiter, getCaptcha);

// Öğrenci numarası doğrula
router.post('/verify', captchaLimiter, verifyStudent);

module.exports = router;
