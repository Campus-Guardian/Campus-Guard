import { M_API, setAuth, clearAuth, getRefreshToken } from '../config/api';

async function parse(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || fallback);
  return data;
}

export async function login(studentId, password) {
  const data = await parse(await fetch(M_API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, password }),
  }), 'Giris basarisiz');
  await setAuth(data.access_token, data.refresh_token, data.user);
  return data;
}

export async function loadCaptcha() {
  const data = await parse(await fetch(M_API + '/btu/captcha'), 'CAPTCHA yuklenemedi');
  return { sessionId: data.sessionId, captchaImage: data.captchaImage };
}

export async function verifyStudent(sessionId, sicilNo, captcha) {
  const data = await parse(await fetch(M_API + '/btu/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, sicilNo, captcha }),
  }), 'Dogrulama basarisiz');

  const registrationTicket = data.registrationTicket || data.registration_ticket;
  if (data.verified && !registrationTicket) {
    throw new Error(
      'Sunucu eski bir surum calistiriyor. CampusGuard backend guncellenmeden kayit tamamlanamaz.'
    );
  }

  return {
    ...data,
    registrationTicket,
    nameHint: data.nameHint || data.name_hint || '',
  };
}

export async function register(studentId, password, registrationTicket) {
  return parse(await fetch(M_API + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: studentId,
      password,
      registration_ticket: registrationTicket,
    }),
  }), 'Kayit basarisiz');
}

export async function logout() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    await fetch(M_API + '/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => {});
  }
  await clearAuth();
}
