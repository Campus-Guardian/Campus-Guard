const { rateLimit } = require('express-rate-limit');

function createLimiter(windowMs, limit) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Cok fazla istek gonderildi. Lutfen daha sonra tekrar deneyin.' },
  });
}

module.exports = {
  authLimiter: createLimiter(15 * 60 * 1000, 20),
  captchaLimiter: createLimiter(5 * 60 * 1000, 20),
  sensorLimiter: createLimiter(60 * 1000, 2000),
};
