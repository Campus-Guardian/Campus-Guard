// CampusGuard Mobile - Main App Logic
let isRunning = false;
let currentDeviceId = null;

// Init
document.addEventListener('DOMContentLoaded', () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  }

  // Check existing auth
  if (mGetToken()) {
    showScreen('appScreen');
    initApp();
  }
});

async function initApp() {
  loadOfflineQueue();
  
  // Check for existing device
  const savedDevice = localStorage.getItem('cg_m_device');
  if (savedDevice) {
    try {
      const dev = JSON.parse(savedDevice);
      currentDeviceId = dev.id;
      document.getElementById('deviceLabel').textContent = dev.device_name;
      document.getElementById('deviceIdLabel').textContent = dev.id.substring(0, 8) + '...';
      setStatus('ready', 'Hazır', 'Sensörleri başlatmak için butona basın');
    } catch (e) {
      localStorage.removeItem('cg_m_device');
      showSetupModal();
    }
  } else {
    showSetupModal();
  }
}

function showSetupModal() {
  document.getElementById('setupModal').classList.add('show');
}

async function setupDevice() {
  const name = document.getElementById('setupDeviceName').value;
  if (!name) return alert('Cihaz adı gerekli');
  
  try {
    const res = await mApi('/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        device_name: name,
        device_type: 'smartphone',
        platform: detectPlatform()
      })
    });
    if (res && res.device) {
      currentDeviceId = res.device.id;
      localStorage.setItem('cg_m_device', JSON.stringify(res.device));
      document.getElementById('deviceLabel').textContent = res.device.device_name;
      document.getElementById('deviceIdLabel').textContent = res.device.id.substring(0, 8) + '...';
      document.getElementById('setupModal').classList.remove('show');
      setStatus('ready', 'Hazır', 'Sensörleri başlatmak için butona basın');
    }
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

function toggleSensors() {
  if (isRunning) {
    stopSensors();
  } else {
    startSensors();
  }
}

function startSensors() {
  if (!currentDeviceId) { showSetupModal(); return; }
  
  isRunning = true;
  startAllSensors();
  startSending(currentDeviceId);
  
  const btn = document.getElementById('btnToggle');
  btn.textContent = '⏹ Sensörleri Durdur';
  btn.classList.remove('btn-start');
  btn.classList.add('btn-stop');
  
  setStatus('active', 'Aktif', 'Sensör verileri gönderiliyor...');
}

function stopSensors() {
  isRunning = false;
  stopAllSensors();
  stopSending();
  
  const btn = document.getElementById('btnToggle');
  btn.textContent = '▶ Sensörleri Başlat';
  btn.classList.remove('btn-stop');
  btn.classList.add('btn-start');
  
  setStatus('ready', 'Durduruldu', 'Sensörler durduruldu');
}

function setStatus(state, text, sub) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  const s = document.getElementById('statusSub');
  
  dot.className = 'status-indicator';
  if (state === 'active') dot.classList.add('active');
  else if (state === 'error') dot.classList.add('error');
  
  txt.textContent = text;
  s.textContent = sub;
}

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  return 'Web';
}
