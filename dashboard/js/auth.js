const API_BASE = window.location.origin + '/api';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('cg_user'));
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('cg_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('cg_user');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function apiRequest(url, options = {}) {
  const request = {
    ...options,
    credentials: 'include',
    headers: { ...options.headers },
  };
  if (request.body && !(request.body instanceof FormData)) {
    request.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(API_BASE + url, request);
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    clearAuth();
    window.location.href = '/dashboard/';
    return null;
  }
  if (!response.ok) throw new Error(data.error || 'Istek basarisiz');
  return data;
}

function showAlert(message, type) {
  const box = document.getElementById('alertBox');
  if (!box) return;
  box.textContent = message;
  box.className = 'alert-msg ' + type;
}

function hideAlert() {
  const box = document.getElementById('alertBox');
  if (box) box.className = 'alert-msg';
}

async function handleLogin(event) {
  event.preventDefault();
  hideAlert();
  const button = document.getElementById('loginBtn');
  button.disabled = true;
  button.textContent = 'Giris yapiliyor...';
  try {
    const response = await fetch(API_BASE + '/auth/admin-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Giris basarisiz');
    setUser(data.user);
    window.location.href = '/dashboard/dashboard.html';
  } catch (error) {
    showAlert(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Giris Yap';
  }
}

async function logout() {
  try {
    await fetch(API_BASE + '/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    clearAuth();
    window.location.href = '/dashboard/';
  }
}

function requireAuth() {
  const user = getUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '/dashboard/';
    return false;
  }

  const avatar = document.getElementById('userAvatar');
  const name = document.getElementById('userName');
  const role = document.getElementById('userRole');
  if (avatar) avatar.textContent = (user.full_name || 'A').charAt(0).toUpperCase();
  if (name) name.textContent = user.full_name || user.email;
  if (role) role.textContent = 'Yonetici';
  return true;
}

const isLoginPage = window.location.pathname.endsWith('/')
  || window.location.pathname.endsWith('/index.html');
if (!isLoginPage) requireAuth();
else if (getUser()?.role === 'admin') window.location.href = '/dashboard/dashboard.html';
