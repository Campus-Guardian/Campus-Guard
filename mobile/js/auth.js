// CampusGuard Mobile - Auth
const M_API = window.location.origin + '/api';

let currentSessionId = null;
let verifiedStudentId = null;

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
  setTimeout(() => el.className = 'mobile-alert', 5000);
}

// ========== LOGIN ==========
async function mobileLogin() {
  const studentId = document.getElementById('mStudentId').value.trim();
  const password = document.getElementById('mPassword').value;

  if (!studentId || !password) {
    return showMobileAlert('mobileAlert', 'Tüm alanları doldurun', 'error');
  }

  try {
    const res = await fetch(M_API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, password })
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

// ========== REGISTER - CAPTCHA ==========
async function loadCaptcha() {
  try {
    const captchaImg = document.getElementById('captchaImg');
    captchaImg.src = '';
    captchaImg.alt = 'Yükleniyor...';

    const res = await fetch(M_API + '/btu/captcha');
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    currentSessionId = data.sessionId;
    captchaImg.src = data.captchaImage;
    captchaImg.alt = 'Güvenlik kodu';
  } catch (err) {
    showMobileAlert('regAlert', 'CAPTCHA yüklenemedi: ' + err.message, 'error');
  }
}

function refreshCaptcha() {
  document.getElementById('mCaptchaInput').value = '';
  loadCaptcha();
}

// ========== REGISTER - DOĞRULAMA ==========
async function verifyStudent() {
  const studentId = document.getElementById('mRegStudentId').value.trim();
  const captcha = document.getElementById('mCaptchaInput').value.trim();

  if (!studentId) {
    return showMobileAlert('regAlert', 'Öğrenci numarası gerekli', 'error');
  }
  if (!captcha) {
    return showMobileAlert('regAlert', 'Güvenlik kodunu girin', 'error');
  }
  if (!currentSessionId) {
    return showMobileAlert('regAlert', 'CAPTCHA yüklenemedi, yenileyin', 'error');
  }

  // Loading state
  document.getElementById('verifyBtnText').textContent = 'Doğrulanıyor...';
  document.getElementById('verifySpinner').style.display = 'inline-block';

  try {
    const res = await fetch(M_API + '/btu/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSessionId,
        sicilNo: studentId,
        captcha: captcha
      })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    if (data.verified) {
      // Doğrulama başarılı → Adım 2'ye geç
      verifiedStudentId = studentId;
      document.getElementById('regStep1').style.display = 'none';
      document.getElementById('regStep2').style.display = 'block';

      // İsim ipucunu göster
      const nameHintEl = document.getElementById('nameHintText');
      if (data.nameHint && nameHintEl) {
        nameHintEl.textContent = data.nameHint;
        document.getElementById('nameHintRow').style.display = 'flex';
      }

      showMobileAlert('regAlert', 'Öğrenci numarası doğrulandı!', 'success');
    } else {
      // Başarısız
      showMobileAlert('regAlert', data.message || 'Doğrulama başarısız', 'error');
      refreshCaptcha();
    }
  } catch (err) {
    showMobileAlert('regAlert', err.message, 'error');
    refreshCaptcha();
  } finally {
    document.getElementById('verifyBtnText').textContent = 'Doğrula';
    document.getElementById('verifySpinner').style.display = 'none';
  }
}

// ========== REGISTER - ŞİFRE BELİRLEME ==========
async function completeRegistration() {
  const password = document.getElementById('mRegPassword').value;
  const confirm = document.getElementById('mRegPasswordConfirm').value;

  if (!password || password.length < 6) {
    return showMobileAlert('regAlert', 'Şifre en az 6 karakter olmalı', 'error');
  }
  if (password !== confirm) {
    return showMobileAlert('regAlert', 'Şifreler eşleşmiyor', 'error');
  }
  if (!verifiedStudentId) {
    return showMobileAlert('regAlert', 'Önce öğrenci numaranızı doğrulayın', 'error');
  }

  try {
    const res = await fetch(M_API + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: verifiedStudentId,
        password: password
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showMobileAlert('regAlert', 'Kayıt başarılı! Giriş yapabilirsiniz.', 'success');

    // 2 saniye sonra login ekranına yönlendir
    setTimeout(() => {
      resetRegisterScreen();
      showScreen('loginScreen');
      document.getElementById('mStudentId').value = verifiedStudentId;
      verifiedStudentId = null;
    }, 2000);

  } catch (err) {
    showMobileAlert('regAlert', err.message, 'error');
  }
}

// ========== EKRAN GEÇİŞLERİ ==========
function mobileLogout() { mClearAuth(); stopSensors(); showScreen('loginScreen'); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showRegScreen() {
  resetRegisterScreen();
  showScreen('registerScreen');
  loadCaptcha();
}

function showLoginScreen() {
  resetRegisterScreen();
  showScreen('loginScreen');
}

function resetRegisterScreen() {
  document.getElementById('regStep1').style.display = 'block';
  document.getElementById('regStep2').style.display = 'none';
  document.getElementById('mRegStudentId').value = '';
  document.getElementById('mCaptchaInput').value = '';
  document.getElementById('mRegPassword').value = '';
  document.getElementById('mRegPasswordConfirm').value = '';
  currentSessionId = null;
  verifiedStudentId = null;
}
