// CampusGuard Mobile - Auth
const M_API = window.location.origin + '/api';

function mGetToken() { return localStorage.getItem('cg_m_token'); }
function mGetUser() { try { return JSON.parse(localStorage.getItem('cg_m_user')); } catch { return null; } }
function mSetAuth(t, u) { localStorage.setItem('cg_m_token', t); localStorage.setItem('cg_m_user', JSON.stringify(u)); }
function mClearAuth() { localStorage.removeItem('cg_m_token'); localStorage.removeItem('cg_m_user'); localStorage.removeItem('cg_m_device'); }

function mHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + mGetToken() };
}

async function mApi(url, opts = {}) {
  opts.headers = { ...mHeaders(), ...opts.headers };
  const res = await fetch(M_API + url, opts);
  const data = await res.json();
  if (res.status === 401) { mClearAuth(); showScreen('loginScreen'); return null; }
  if (!res.ok) throw new Error(data.error || 'Hata');
  return data;
}

function showMobileAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'mobile-alert show ' + type;
  setTimeout(() => el.className = 'mobile-alert', 4000);
}

async function mobileLogin() {
  try {
    const res = await fetch(M_API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('mEmail').value,
        password: document.getElementById('mPassword').value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    mSetAuth(data.token, data.user);
    showScreen('appScreen');
    initApp();
  } catch (err) {
    showMobileAlert('mobileAlert', err.message, 'error');
  }
}

async function mobileRegister() {
  try {
    const res = await fetch(M_API + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: document.getElementById('mRegName').value,
        email: document.getElementById('mRegEmail').value,
        password: document.getElementById('mRegPass').value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    mSetAuth(data.token, data.user);
    showScreen('appScreen');
    initApp();
  } catch (err) {
    showMobileAlert('regAlert', err.message, 'error');
  }
}

function mobileLogout() { mClearAuth(); stopSensors(); showScreen('loginScreen'); }
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showRegScreen() { showScreen('registerScreen'); }
function showLoginScreen() { showScreen('loginScreen'); }
