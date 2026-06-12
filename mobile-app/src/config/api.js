import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl
  || 'https://campus-guard-7rq8.onrender.com';
export const M_API = API_BASE_URL + '/api';

const ACCESS_KEY = 'cg_access_token';
const REFRESH_KEY = 'cg_refresh_token';

export async function getToken() {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function getUser() {
  try {
    const value = await AsyncStorage.getItem('cg_m_user');
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function setAuth(accessToken, refreshToken, user) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    AsyncStorage.setItem('cg_m_user', JSON.stringify(user)),
  ]);
}

export async function clearAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    AsyncStorage.multiRemove(['cg_m_user', 'cg_m_device']),
  ]);
}

async function refreshSession() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  const response = await fetch(M_API + '/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return false;
  const data = await response.json();
  await setAuth(data.access_token, data.refresh_token, data.user);
  return true;
}

export async function mApi(url, options = {}, allowRefresh = true) {
  const token = await getToken();
  const response = await fetch(M_API + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && allowRefresh && await refreshSession()) {
    return mApi(url, options, false);
  }

  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    await clearAuth();
    throw new Error('Oturum suresi doldu');
  }
  if (!response.ok) {
    const details = Array.isArray(data.details) ? `: ${data.details.join(', ')}` : '';
    throw new Error((data.error || 'Istek basarisiz') + details);
  }
  return data;
}
