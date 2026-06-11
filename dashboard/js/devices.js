// CampusGuard - Devices Page + Simulator
let simMap = null;
let simMarker = null;
let simLat = null;
let simLng = null;
let dangerZones = [];

const CAMPUS_CENTER = [40.1889, 29.1310];
const CAMPUS_BOUNDS = L.latLngBounds(
  [40.186121, 29.125768], // Güneybatı (sol-alt)
  [40.191767, 29.136281]  // Kuzeydoğu (sağ-üst)
);

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadDevices();
});

// ======== Cihaz Listesi ========
async function loadDevices() {
  try {
    const res = await apiRequest('/devices');
    const tbody = document.getElementById('deviceTableBody');
    if (!res || !res.data || res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Kayıtlı cihaz yok</td></tr>';
      return;
    }
    const now = Date.now();
    tbody.innerHTML = res.data.map(d => {
      const isOnline = d.last_seen && (now - new Date(d.last_seen).getTime()) < 300000;
      return `<tr>
        <td><strong>${d.device_name}</strong></td>
        <td>${d.device_type || 'smartphone'}</td>
        <td>${d.platform || '-'}</td>
        <td><span class="badge ${isOnline ? 'badge-online' : 'badge-offline'}">${isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</span></td>
        <td>${d.last_seen ? new Date(d.last_seen).toLocaleString('tr-TR') : '-'}</td>
        <td>${d.last_latitude ? d.last_latitude.toFixed(5)+', '+d.last_longitude.toFixed(5) : '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openSimForDevice('${d.id}','${d.device_name}')" title="Test verisi gönder">🧪</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDevice('${d.id}')">🗑️</button>
        </td>
      </tr>`;
    }).join('');
  } catch (err) { console.error(err); }
}

function showRegisterDevice() { document.getElementById('deviceModal').classList.add('show'); }

function closeModal(id) { document.getElementById(id).classList.remove('show'); }

async function registerDevice() {
  try {
    await apiRequest('/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        device_name: document.getElementById('deviceName').value,
        device_type: document.getElementById('deviceType').value,
        platform: document.getElementById('devicePlatform').value
      })
    });
    closeModal('deviceModal');
    loadDevices();
  } catch (err) { alert('Hata: ' + err.message); }
}

async function deleteDevice(id) {
  if (!confirm('Bu cihazı silmek istediğinizden emin misiniz?')) return;
  try { await apiRequest('/devices/' + id, { method: 'DELETE' }); loadDevices(); }
  catch (err) { alert('Hata: ' + err.message); }
}

// ======== Simülatör ========
async function showSimulator() {
  document.getElementById('simModal').classList.add('show');
  await loadDevicesForSim();
  await loadDangerZones();
  initSimMap();
}

async function openSimForDevice(deviceId, deviceName) {
  document.getElementById('simModal').classList.add('show');
  await loadDevicesForSim(deviceId);
  await loadDangerZones();
  initSimMap();
}

async function loadDevicesForSim(selectId) {
  try {
    const res = await apiRequest('/devices');
    const sel = document.getElementById('simDevice');
    if (!res || !res.data || res.data.length === 0) {
      sel.innerHTML = '<option value="">Kayıtlı cihaz yok — önce cihaz ekleyin</option>';
      return;
    }
    sel.innerHTML = res.data.map(d =>
      `<option value="${d.id}" ${d.id === selectId ? 'selected' : ''}>${d.device_name}</option>`
    ).join('');
  } catch (err) { console.error(err); }
}

async function loadDangerZones() {
  try {
    const res = await apiRequest('/zones');
    if (!res || !res.data) return;
    dangerZones = res.data.filter(z => z.type === 'danger' || z.type === 'restricted');

    const container = document.getElementById('dangerZonesBtns');
    if (dangerZones.length === 0) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = '<span style="font-size:11px;color:var(--text-muted);align-self:center">Bölgeye gönder:</span>' +
      dangerZones.map(z =>
        `<button class="dz-btn" onclick="jumpToZone('${z.id}')">${z.name}</button>`
      ).join('');
  } catch (err) { console.error(err); }
}

function jumpToZone(zoneId) {
  const zone = dangerZones.find(z => z.id === zoneId);
  if (!zone || !zone.polygon || zone.polygon.length === 0) return;
  // Polygon merkezi hesapla
  const lats = zone.polygon.map(p => p[0]);
  const lngs = zone.polygon.map(p => p[1]);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
  setSimLocation(centerLat, centerLng);
  simMap.setView([centerLat, centerLng], 18);
}

function initSimMap() {
  if (simMap) {
    simMap.invalidateSize();
    return;
  }

  setTimeout(() => {
    simMap = L.map('simMap', {
      minZoom: 15,
      maxZoom: 19,
      maxBounds: CAMPUS_BOUNDS,
      maxBoundsViscosity: 1.0
    }).setView(CAMPUS_CENTER, 17);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO', maxZoom: 19
    }).addTo(simMap);

    // Mevcut bölgeleri göster
    dangerZones.forEach(z => {
      if (z.polygon && z.polygon.length >= 3) {
        L.polygon(z.polygon, { color: z.color || '#ef4444', fillOpacity: 0.15, weight: 1.5 })
          .addTo(simMap)
          .bindPopup(`<b>${z.name}</b>`);
      }
    });

    simMap.on('click', (e) => {
      setSimLocation(e.latlng.lat, e.latlng.lng);
    });
  }, 200);
}

function setSimLocation(lat, lng) {
  simLat = lat;
  simLng = lng;
  document.getElementById('simCoordsDisplay').textContent =
    `Seçili konum: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  if (simMarker) {
    simMarker.setLatLng([lat, lng]);
  } else {
    simMarker = L.circleMarker([lat, lng], {
      radius: 10, color: '#ef4444', fillColor: '#f87171', fillOpacity: 0.9, weight: 2
    }).addTo(simMap).bindPopup('Test konumu').openPopup();
  }
}

function updateSliderVal(sliderId, valId, unit) {
  const val = parseFloat(document.getElementById(sliderId).value);
  document.getElementById(valId).textContent = val + unit;
}

function applyPreset(type) {
  const presets = {
    noise:  { simNoise: 95, simAccX: 0, simAccY: 0, simAccZ: 9.8, simSpeed: 5 },
    motion: { simNoise: 60, simAccX: 18, simAccY: 12, simAccZ: 22, simSpeed: 0 },
    speed:  { simNoise: 65, simAccX: 2, simAccY: 1, simAccZ: 9.8, simSpeed: 45 },
    normal: { simNoise: 50, simAccX: 0.1, simAccY: 0.2, simAccZ: 9.8, simSpeed: 0 }
  };
  const p = presets[type];
  if (!p) return;
  Object.entries(p).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
  });
}

async function sendSimData() {
  const deviceId = document.getElementById('simDevice').value;
  if (!deviceId) return showSimResult('Lütfen bir cihaz seçin', 'error');
  if (!simLat || !simLng) return showSimResult('Lütfen haritadan bir konum seçin', 'error');

  const btn = document.getElementById('simSendBtn');
  btn.disabled = true; btn.textContent = 'Gönderiliyor...';

  const payload = {
    device_id: deviceId,
    latitude: simLat,
    longitude: simLng,
    noise_level: parseFloat(document.getElementById('simNoise').value),
    acceleration_x: parseFloat(document.getElementById('simAccX').value),
    acceleration_y: parseFloat(document.getElementById('simAccY').value),
    acceleration_z: parseFloat(document.getElementById('simAccZ').value),
    speed: parseFloat(document.getElementById('simSpeed').value),
    battery_level: parseInt(document.getElementById('simBattery').value),
    network_type: '4g'
  };

  try {
    const res = await apiRequest('/sensors/data', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const anomalyCount = res.anomalies || 0;
    showSimResult(
      `✅ Veri gönderildi! ${anomalyCount > 0 ? '⚠️ ' + anomalyCount + ' anomali tespit edildi!' : 'Anomali yok.'}`,
      anomalyCount > 0 ? 'warn' : 'ok'
    );
    loadDevices();
  } catch (err) {
    showSimResult('❌ Hata: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '📡 Veri Gönder';
  }
}

function showSimResult(msg, type) {
  const el = document.getElementById('simResult');
  const colors = { ok: 'var(--success)', error: 'var(--danger)', warn: 'var(--warning)' };
  el.style.color = colors[type] || 'var(--text-secondary)';
  el.textContent = msg;
}
