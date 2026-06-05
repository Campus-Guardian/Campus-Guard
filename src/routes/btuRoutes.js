const router = require('express').Router();
const { getCaptcha, verifyStudent } = require('../controllers/btuController');

// CAPTCHA görselini al
router.get('/captcha', getCaptcha);

// Öğrenci numarası doğrula
router.post('/verify', verifyStudent);

module.exports = router;
