const router = require('express').Router();
const {
  register,
  login,
  getMe,
  adminLogin,
  refresh,
  logout,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimits');
const {
  validate,
  registerSchema,
  loginSchema,
  adminLoginSchema,
  refreshSchema,
} = require('../middleware/validation');

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/admin-login', authLimiter, validate(adminLoginSchema), adminLogin);
router.post('/refresh', authLimiter, validate(refreshSchema), refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

module.exports = router;
