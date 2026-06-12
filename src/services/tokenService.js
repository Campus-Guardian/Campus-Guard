const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const ACCESS_COOKIE = 'cg_access';
const DAY_MS = 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createOpaqueToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function createAccessToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function setAccessCookie(res, token) {
  res.cookie(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });
}

function clearAccessCookie(res) {
  res.clearCookie(ACCESS_COOKIE, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

async function createSession(sessionType, userId, metadata, ttlMs) {
  const token = createOpaqueToken();
  const { error } = await supabase.from('auth_sessions').insert({
    user_id: userId || null,
    session_type: sessionType,
    token_hash: hashToken(token),
    metadata: metadata || {},
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
  });
  if (error) throw error;
  return token;
}

async function createRegistrationTicket(studentId, nameHint) {
  return createSession(
    'registration',
    null,
    { student_id: studentId, name_hint: nameHint || '' },
    5 * 60 * 1000
  );
}

async function consumeRegistrationTicket(token, studentId) {
  if (!token) return null;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('auth_sessions')
    .select('*')
    .eq('token_hash', hashToken(token))
    .eq('session_type', 'registration')
    .is('used_at', null)
    .is('revoked_at', null)
    .gt('expires_at', now)
    .maybeSingle();

  if (error || !data || data.metadata?.student_id !== studentId) return null;

  const { data: consumed, error: consumeError } = await supabase
    .from('auth_sessions')
    .update({ used_at: now })
    .eq('id', data.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle();

  if (consumeError || !consumed) return null;
  return data.metadata;
}

async function createRefreshToken(userId) {
  const days = Math.max(1, Number(process.env.REFRESH_TOKEN_DAYS) || 30);
  return createSession('refresh', userId, {}, days * DAY_MS);
}

async function rotateRefreshToken(token) {
  if (!token) return null;
  const now = new Date().toISOString();
  const { data: session, error } = await supabase
    .from('auth_sessions')
    .select('id, user_id')
    .eq('token_hash', hashToken(token))
    .eq('session_type', 'refresh')
    .is('revoked_at', null)
    .gt('expires_at', now)
    .maybeSingle();

  if (error || !session) return null;
  const { data: revoked, error: revokeError } = await supabase
    .from('auth_sessions')
    .update({ revoked_at: now })
    .eq('id', session.id)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();
  if (revokeError || !revoked) return null;
  return {
    userId: session.user_id,
    refreshToken: await createRefreshToken(session.user_id),
  };
}

async function revokeRefreshToken(token) {
  if (!token) return;
  await supabase
    .from('auth_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', hashToken(token))
    .eq('session_type', 'refresh');
}

module.exports = {
  ACCESS_COOKIE,
  createAccessToken,
  setAccessCookie,
  clearAccessCookie,
  createRegistrationTicket,
  consumeRegistrationTicket,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
};
