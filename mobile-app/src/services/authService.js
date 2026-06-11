// CampusGuard Mobile - Auth Service
import { M_API, setAuth, clearAuth, getToken } from '../config/api';

export async function login(studentId, password) {
  const res = await fetch(M_API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Giriş başarısız');
  await setAuth(data.token, data.user);
  return data;
}

export async function loadCaptcha() {
  const res = await fetch(M_API + '/btu/captcha');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'CAPTCHA yüklenemedi');
  return { sessionId: data.sessionId, captchaImage: data.captchaImage };
}

export async function verifyStudent(sessionId, sicilNo, captcha) {
  const res = await fetch(M_API + '/btu/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, sicilNo, captcha }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Doğrulama başarısız');
  return data;
}

export async function register(studentId, password) {
  const res = await fetch(M_API + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Kayıt başarısız');
  return data;
}

export async function logout() {
  await clearAuth();
}
