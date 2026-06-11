// CampusGuard - Admin Dashboard Auth Helper
const API_BASE = window.location.origin + '/api';

function getToken() { return localStorage.getItem('cg_token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('cg_user')); } catch { return null; } }
function setAuth(token, user) { localStorage.setItem('cg_token', token); localStorage.setItem('cg_user', JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem('cg_token'); localStorage.removeItem('cg_user'); }

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
}

async function apiRequest(url, options = {}) {
  options.headers = { ...authHeaders(), ...options.headers };
  const res = await fetch(API_BASE + url, options);
  const data = await res.json();
  if (res.status === 401) { clearAuth(); window.location.href = '/dashboard/'; return null; }
  if (!res.ok) throw new Error(data.error || 'İstek başarısız');
  return data;
}

function showAlert(msg, type) {
  const box = document.getElementById('alertBox');
  if (!box) return;
  box.textContent = msg;
  box.className = 'alert-msg ' + type;
}
function hideAlert() { const box = document.getElementById('alertBox'); if (box) box.className = 'alert-msg'; }

// Admin login (email + password) — Dashboard için
async function handleLogin(e) {
  e.preventDefault();
  hideAlert();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Giriş yapılıyor...';
  try {
    const res = await fetch(API_BASE + '/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Giriş başarısız');
    setAuth(data.token, data.user);
    window.location.href = '/dashboard/dashboard.html';
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Giriş Yap';
  }
}

function logout() { clearAuth(); window.location.href = '/dashboard/'; }

// Dashboard sayfalarında auth kontrolü
function requireAuth() {
  if (!getToken()) { window.location.href = '/dashboard/'; return false; }
  const user = getUser();
  if (user) {
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userName');
    const role = document.getElementById('userRole');
    if (avatar) avatar.textContent = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'A';
    if (name) name.textContent = user.full_name || user.email;
    if (role) role.textContent = user.role === 'admin' ? 'Yönetici' : 'Kullanıcı';
  }
  return true;
}

// Login sayfasında değilse auth kontrolü yap
if (!window.location.pathname.endsWith('/') && !window.location.pathname.endsWith('/index.html')) {
  requireAuth();
} else if (getToken()) {
  // Zaten giriş yapılmış, dashboard'a yönlendir
  window.location.href = '/dashboard/dashboard.html';
}
