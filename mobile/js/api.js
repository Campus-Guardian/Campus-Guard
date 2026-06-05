// CampusGuard Mobile - API Communication
const SEND_INTERVAL = 5000; // 5 saniye
let sendTimer = null;
let dataCount = 0;
let offlineQueue = [];

async function startSending(deviceId) {
  if (sendTimer) return;
  sendTimer = setInterval(async () => {
    const snapshot = getSensorSnapshot();
    snapshot.device_id = deviceId;

    try {
      const res = await mApi('/sensors/data', {
        method: 'POST',
        body: JSON.stringify(snapshot)
      });
      if (res) {
        dataCount++;
        updateUI('sDataCount', dataCount);
        // Send any queued offline data
        if (offlineQueue.length > 0) {
          await sendOfflineQueue(deviceId);
        }
      }
    } catch (err) {
      console.warn('Gönderim hatası, kuyruğa ekleniyor:', err);
      offlineQueue.push({ ...snapshot, timestamp: new Date().toISOString() });
      saveOfflineQueue();
    }
  }, SEND_INTERVAL);
}

function stopSending() {
  if (sendTimer) { clearInterval(sendTimer); sendTimer = null; }
}

async function sendOfflineQueue(deviceId) {
  if (offlineQueue.length === 0) return;
  try {
    await mApi('/sensors/batch', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId, data: offlineQueue })
    });
    offlineQueue = [];
    localStorage.removeItem('cg_offline');
  } catch (e) { /* retry next time */ }
}

function saveOfflineQueue() {
  try { localStorage.setItem('cg_offline', JSON.stringify(offlineQueue)); } catch (e) {}
}

function loadOfflineQueue() {
  try { offlineQueue = JSON.parse(localStorage.getItem('cg_offline') || '[]'); } catch (e) { offlineQueue = []; }
}
