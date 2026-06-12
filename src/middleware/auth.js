const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

async function getUserFromAccessToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== 'access') throw new Error('Invalid token type');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, student_id, email, full_name, role, is_active')
    .eq('id', decoded.userId)
    .maybeSingle();

  if (error || !user || !user.is_active) return null;
  return user;
}

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearerToken || req.cookies?.cg_access;
    if (!token) return res.status(401).json({ error: 'Yetkilendirme tokeni gerekli' });

    const user = await getUserFromAccessToken(token);
    if (!user) return res.status(401).json({ error: 'Gecersiz token' });

    req.user = user;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token suresi dolmus' : 'Gecersiz token';
    return res.status(401).json({ error: message });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bu islem icin admin yetkisi gerekli' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, getUserFromAccessToken };
