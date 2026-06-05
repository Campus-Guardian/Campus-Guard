// CampusGuard - Auth Helper
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

// Login page specific
function showTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', (tab === 'login' ? i === 0 : i === 1)));
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  hideAlert();
}

function showAlert(msg, type) {
  const box = document.getElementById('alertBox');
  if (!box) return;
  box.textContent = msg;
  box.className = 'alert-msg ' + type;
}
function hideAlert() { const box = document.getElementById('alertBox'); if (box) box.className = 'alert-msg'; }

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Giriş yapılıyor...';
  try {
    const res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setAuth(data.token, data.user);
    window.location.href = '/dashboard/dashboard.html';
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Giriş Yap';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('regBtn');
  btn.disabled = true; btn.textContent = 'Kayıt yapılıyor...';
  try {
    const res = await fetch(API_BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setAuth(data.token, data.user);
    window.location.href = '/dashboard/dashboard.html';
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Kayıt Ol';
  }
}

function logout() { clearAuth(); window.location.href = '/dashboard/'; }

// Check auth on dashboard pages
function requireAuth() {
  if (!getToken()) { window.location.href = '/dashboard/'; return false; }
  const user = getUser();
  if (user) {
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userName');
    const role = document.getElementById('userRole');
    if (avatar) avatar.textContent = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
    if (name) name.textContent = user.full_name || user.email;
    if (role) role.textContent = user.role === 'admin' ? 'Yönetici' : 'Kullanıcı';
  }
  return true;
}

// Auto-check on dashboard pages (not login)
if (!window.location.pathname.endsWith('/') && !window.location.pathname.endsWith('/index.html')) {
  requireAuth();
} else if (getToken()) {
  // Already logged in, redirect to dashboard
  window.location.href = '/dashboard/dashboard.html';
}
