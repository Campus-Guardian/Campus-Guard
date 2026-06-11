// CampusGuard Mobile - API Configuration
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend sunucu URL'si (Render deployment)
const API_BASE_URL = 'https://campus-guard-7rq8.onrender.com';

export const M_API = API_BASE_URL + '/api';

export async function getToken() {
  return await AsyncStorage.getItem('cg_m_token');
}

export async function getUser() {
  try {
    const u = await AsyncStorage.getItem('cg_m_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export async function setAuth(token, user) {
  await AsyncStorage.setItem('cg_m_token', token);
  await AsyncStorage.setItem('cg_m_user', JSON.stringify(user));
}

export async function clearAuth() {
  await AsyncStorage.multiRemove(['cg_m_token', 'cg_m_user', 'cg_m_device']);
}

export async function mHeaders() {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  };
}

export async function mApi(url, opts = {}) {
  const headers = { ...(await mHeaders()), ...opts.headers };
  const res = await fetch(M_API + url, { ...opts, headers });
  const data = await res.json();
  if (res.status === 401) {
    await clearAuth();
    return null;
  }
  if (!res.ok) throw new Error(data.error || 'Hata');
  return data;
}
