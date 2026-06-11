const router = require('express').Router();
const { register, login, getMe, adminLogin } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, registerSchema, loginSchema, adminLoginSchema } = require('../middleware/validation');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/admin-login', validate(adminLoginSchema), adminLogin); // Dashboard admin girişi
router.get('/me', authenticate, getMe);

module.exports = router;
