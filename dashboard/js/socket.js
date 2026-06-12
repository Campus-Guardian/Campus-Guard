// CampusGuard - Socket.io Client
let socket = null;

// ========= Küresel Acil Durum Ses Fonksiyonları =========
window.playEmergencyAlarm = function () {
  let audio = document.getElementById('alarmAudio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'alarmAudio';
    audio.src = '/dashboard/sounds/alarm.mp3';
    audio.loop = true;
    audio.preload = 'auto';
    document.body.appendChild(audio);
  }
  audio.currentTime = 0;
  audio.play()
    .then(() => removeAutoplayWarning())
    .catch(() => showAutoplayWarning());
};

window.stopEmergencyAlarm = function () {
  const audio = document.getElementById('alarmAudio');
  if (audio) { audio.pause(); audio.currentTime = 0; }
  const btn = document.getElementById('muteAlarmBtn');
  if (btn) btn.textContent = '🔇 Ses Kapatıldı';
};

// Geriye dönük uyumluluk takma adları
window.playAlarmSound = window.playEmergencyAlarm;
window.stopAlarmSound = window.stopEmergencyAlarm;

// Tarayıcı autoplay engelini ilk tıklamada/tuşta kaldır
const _unlockAudio = () => {
  let audio = document.getElementById('alarmAudio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'alarmAudio';
    audio.src = '/dashboard/sounds/alarm.mp3';
    audio.loop = true;
    audio.preload = 'auto';
    document.body.appendChild(audio);
  }
  audio.play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      console.log('[Audio] Ses kilidi açıldı.');
      document.removeEventListener('click', _unlockAudio);
      document.removeEventListener('keydown', _unlockAudio);
      removeAutoplayWarning();
    })
    .catch(() => { /* Henüz kullanıcı etkileşimi olmadı */ });
};
document.addEventListener('click', _unlockAudio);
document.addEventListener('keydown', _unlockAudio);

function showAutoplayWarning() {
  if (document.getElementById('autoplay-warning')) return;
  const el = document.createElement('div');
  el.id = 'autoplay-warning';
  el.style.cssText = [
    'position:fixed', 'bottom:20px', 'right:20px',
    'background:#ef4444', 'color:white',
    'padding:14px 20px', 'border-radius:8px',
    'box-shadow:0 4px 20px rgba(239,68,68,0.4)',
    'z-index:99999', 'cursor:pointer',
    'font-size:14px', 'font-weight:600',
    'display:flex', 'align-items:center', 'gap:8px',
    'animation:_warnBounce 0.9s ease-in-out infinite alternate'
  ].join(';');
  el.innerHTML = '🔊 Acil durum sesini etkinleştirmek için tıklayın!';
  if (!document.getElementById('_warnBounceStyle')) {
    const s = document.createElement('style');
    s.id = '_warnBounceStyle';
    s.innerHTML = '@keyframes _warnBounce{from{transform:translateY(0)}to{transform:translateY(-7px)}}';
    document.head.appendChild(s);
  }
  el.onclick = () => { window.playEmergencyAlarm(); el.remove(); };
  document.body.appendChild(el);
}

function removeAutoplayWarning() {
  const el = document.getElementById('autoplay-warning');
  if (el) el.remove();
}

// ========= Socket.io Başlatma =========
function initSocket() {
  if (socket) return;
  socket = io(window.location.origin);
  window.socket = socket; // Diğer scriptler de erişebilsin

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
    socket.emit('join-dashboard');
  });

  socket.on('new-alert', (alert) => {
    console.log('[Socket] New alert:', alert);
    const countEl = document.getElementById('alertCount');
    if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof loadAlerts === 'function') loadAlerts();
    if (typeof loadAlertStats === 'function') loadAlertStats();
  });

  // Acil durum alarmı
  socket.on('emergency-alert', (alert) => {
    console.log('[Socket] EMERGENCY alert:', alert);
    window.playEmergencyAlarm();
    if (typeof showEmergencyBanner === 'function') showEmergencyBanner(alert);
    const countEl = document.getElementById('alertCount');
    if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof loadAlerts === 'function') loadAlerts();
    if (typeof loadAlertStats === 'function') loadAlertStats();
  });

  socket.on('alert-count-update', () => {
    console.log('[Socket] Alert count update');
    if (typeof loadStats === 'function') loadStats();
    if (typeof loadAlertStats === 'function') loadAlertStats();
  });

  socket.on('all-alerts-resolved', () => {
    console.log('[Socket] All alerts resolved');
    const countEl = document.getElementById('alertCount');
    if (countEl) countEl.textContent = '0';
    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof loadAlerts === 'function') loadAlerts();
    if (typeof loadAlertStats === 'function') loadAlertStats();
  });

  socket.on('sensor-update', (data) => {
    if (typeof updateDeviceOnMap === 'function') updateDeviceOnMap(data);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
  });
}

// Sayfa yüklenince başlat
if (typeof io !== 'undefined') {
  initSocket();
}
