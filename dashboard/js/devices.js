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
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Kayıtlı cihaz yok</td></tr>';
      return;
    }
    const now = Date.now();
    tbody.innerHTML = res.data.map(d => {
      const isOnline = d.last_seen && (now - new Date(d.last_seen).getTime()) < 300000;
      return `<tr>
        <td><strong>${d.student_id || '-'}</strong></td>
        <td>${d.user_name || '-'}</td>
        <td>${d.device_type || 'smartphone'}</td>
        <td>${d.platform || '-'}</td>
        <td><span class="badge ${isOnline ? 'badge-online' : 'badge-offline'}">${isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</span></td>
        <td>${d.last_seen ? new Date(d.last_seen).toLocaleString('tr-TR') : '-'}</td>
        <td>${d.last_latitude ? d.last_latitude.toFixed(5)+', '+d.last_longitude.toFixed(5) : '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openSimForDevice('${d.id}','${d.student_id || d.device_name}')" title="Test verisi gönder">🧪</button>
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
    const studentId = document.getElementById('deviceStudentId').value.trim();
    if (!studentId) {
      alert('Öğrenci numarası gereklidir');
      return;
    }
    await apiRequest('/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        device_name: studentId,
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
      `<option value="${d.id}" ${d.id === selectId ? 'selected' : ''}>${d.student_id || d.device_name}</option>`
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

// Active Simulators State Management
const activeSimulators = {};

function switchSimTab(tab) {
  document.querySelectorAll('.sim-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.sim-tab-content').forEach(c => c.classList.remove('active'));
  
  if (tab === 'single') {
    document.querySelector('.sim-tab-btn:nth-child(1)').classList.add('active');
    document.getElementById('simTabSingle').classList.add('active');
    if (simMap) {
      setTimeout(() => simMap.invalidateSize(), 100);
    }
  } else {
    document.querySelector('.sim-tab-btn:nth-child(2)').classList.add('active');
    document.getElementById('simTabBulk').classList.add('active');
  }
}

function updateSliderVal(sliderId, valId, unit) {
  const val = parseFloat(document.getElementById(sliderId).value);
  document.getElementById(valId).textContent = val + unit;
}

function applyPreset(type) {
  const presets = {
    noise:  { simNoise: 95, simAccX: 0.1, simAccY: 0.2, simAccZ: 9.8, simSpeed: 5 },
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

// Generate Bulk Test Devices via Backend
async function generateBulkDevices() {
  const count = parseInt(document.getElementById('bulkCount').value) || 10;
  const btn = document.getElementById('bulkGenerateBtn');
  btn.disabled = true; btn.textContent = 'Oluşturuluyor...';
  
  try {
    const res = await apiRequest('/simulator/generate', {
      method: 'POST',
      body: JSON.stringify({ count })
    });
    showSimResult(`✅ ${res.message || 'Cihazlar oluşturuldu!'}`, 'ok');
    await loadDevices();
    await loadDevicesForSim();
  } catch (err) {
    showSimResult('❌ Hata: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '👥 Cihazları Ata / Oluştur';
  }
}

// Cleanup Bulk Test Devices via Backend
async function cleanupBulkDevices() {
  if (!confirm('Tüm test öğrencilerini, bunlara ait cihazları ve alarmları silmek istediğinizden emin misiniz?')) return;
  
  const btn = document.getElementById('bulkCleanupBtn');
  btn.disabled = true; btn.textContent = 'Temizleniyor...';
  
  try {
    // Stop all running simulations first
    stopAllSimulators();
    
    const res = await apiRequest('/simulator/cleanup', {
      method: 'DELETE'
    });
    showSimResult(`✅ ${res.message || 'Test verileri temizlendi!'}`, 'ok');
    await loadDevices();
    await loadDevicesForSim();
  } catch (err) {
    showSimResult('❌ Hata: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '🗑️ Grubu Temizle';
  }
}

// Start Single Device Simulation
function startSingleSim() {
  const deviceId = document.getElementById('simDevice').value;
  if (!deviceId) return showSimResult('Lütfen bir cihaz seçin', 'error');
  if (!simLat || !simLng) return showSimResult('Lütfen haritadan bir konum seçin', 'error');

  const sel = document.getElementById('simDevice');
  const deviceName = sel.options[sel.selectedIndex].text;
  
  const intervalSeconds = parseInt(document.getElementById('simInterval').value) || 5;
  const maxPackets = parseInt(document.getElementById('simMaxPackets').value) || 0;
  const walkEffect = document.getElementById('simWalkEffect').checked;

  if (activeSimulators[deviceId]) {
    stopSimulator(deviceId);
  }

  // Create simulator configuration
  const sim = {
    id: deviceId,
    name: deviceName,
    lat: simLat,
    lng: simLng,
    walk: walkEffect,
    interval: intervalSeconds,
    maxPackets: maxPackets,
    packetsSent: 0,
    preset: 'custom',
    customData: () => ({
      noise_level: parseFloat(document.getElementById('simNoise').value),
      acceleration_x: parseFloat(document.getElementById('simAccX').value),
      acceleration_y: parseFloat(document.getElementById('simAccY').value),
      acceleration_z: parseFloat(document.getElementById('simAccZ').value),
      speed: parseFloat(document.getElementById('simSpeed').value),
      battery_level: parseInt(document.getElementById('simBattery').value),
      network_type: '4g'
    })
  };

  // Run first packet instantly
  sendSimulatorPacket(sim);

  // Set interval
  sim.intervalId = setInterval(() => {
    sendSimulatorPacket(sim);
  }, intervalSeconds * 1000);

  activeSimulators[deviceId] = sim;
  updateSimsUI();
  showSimResult(`📡 ${deviceName} için sürekli gönderim başlatıldı.`, 'ok');
}

// Start Bulk Simulator
async function startBulkSim() {
  try {
    const res = await apiRequest('/devices');
    if (!res || !res.data) return showSimResult('Cihaz listesi yüklenemedi', 'error');
    
    // Find all test devices (name starts with "Test Cihaz" or student_id starts with "TEST")
    const testDevices = res.data.filter(d => 
      (d.device_name && d.device_name.startsWith('Test Cihaz')) || 
      (d.student_id && d.student_id.startsWith('TEST'))
    );

    if (testDevices.length === 0) {
      return showSimResult('⚠️ Başlatılabilecek test cihazı bulunamadı. Lütfen önce "Cihazları Ata / Oluştur" butonu ile test grubunu oluşturun.', 'warn');
    }

    const intervalSeconds = parseInt(document.getElementById('bulkInterval').value) || 5;
    const maxPackets = parseInt(document.getElementById('bulkMaxPackets').value) || 0;
    const mode = document.getElementById('bulkPreset').value;

    let startedCount = 0;

    testDevices.forEach(d => {
      if (activeSimulators[d.id]) {
        stopSimulator(d.id);
      }

      // Initial coordinates
      let deviceLat = d.last_latitude || (CAMPUS_CENTER[0] + (Math.random() - 0.5) * 0.003);
      let deviceLng = d.last_longitude || (CAMPUS_CENTER[1] + (Math.random() - 0.5) * 0.003);

      const sim = {
        id: d.id,
        name: d.student_id || d.device_name,
        lat: deviceLat,
        lng: deviceLng,
        walk: true,
        interval: intervalSeconds,
        maxPackets: maxPackets,
        packetsSent: 0,
        preset: mode,
        customData: () => {
          let noise = 55;
          let speed = 0;
          let accX = 0.1, accY = 0.2, accZ = 9.8;

          switch(mode) {
            case 'noise':
              noise = parseFloat((85 + Math.random() * 20).toFixed(1)); // 85 - 105 dB
              speed = parseFloat((Math.random() * 4).toFixed(1));
              break;
            case 'speed':
              noise = parseFloat((55 + Math.random() * 15).toFixed(1));
              speed = parseFloat((35 + Math.random() * 30).toFixed(1)); // 35 - 65 km/h
              accX = parseFloat((Math.random() * 5).toFixed(1));
              break;
            case 'danger':
              noise = parseFloat((50 + Math.random() * 15).toFixed(1));
              speed = parseFloat((3 + Math.random() * 6).toFixed(1));
              
              // Shift towards first danger zone center
              if (dangerZones && dangerZones.length > 0) {
                const zone = dangerZones[0];
                if (zone.polygon && zone.polygon.length > 0) {
                  const lats = zone.polygon.map(p => p[0]);
                  const lngs = zone.polygon.map(p => p[1]);
                  const cLat = lats.reduce((a, b) => a + b, 0) / lats.length;
                  const cLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
                  
                  // Move 15% closer to center in each step
                  sim.lat = sim.lat + (cLat - sim.lat) * 0.15;
                  sim.lng = sim.lng + (cLng - sim.lng) * 0.15;
                }
              }
              break;
            case 'random':
              noise = parseFloat((35 + Math.random() * 70).toFixed(1)); // 35 - 105
              speed = Math.random() > 0.85 ? parseFloat((40 + Math.random() * 30).toFixed(1)) : parseFloat((Math.random() * 6).toFixed(1));
              if (speed > 30) accX = 12;
              break;
            case 'normal':
            default:
              noise = parseFloat((45 + Math.random() * 15).toFixed(1)); // 45 - 60 dB
              speed = parseFloat((Math.random() * 5).toFixed(1));       // Walking speed
              break;
          }

          return {
            noise_level: noise,
            acceleration_x: accX,
            acceleration_y: accY,
            acceleration_z: accZ,
            speed: speed,
            battery_level: Math.floor(60 + Math.random() * 40),
            network_type: 'wifi'
          };
        }
      };

      // Run first packet instantly
      sendSimulatorPacket(sim);

      // Start loop
      sim.intervalId = setInterval(() => {
        sendSimulatorPacket(sim);
      }, intervalSeconds * 1000);

      activeSimulators[d.id] = sim;
      startedCount++;
    });

    updateSimsUI();
    showSimResult(`🚀 ${startedCount} test cihazı için toplu simülasyon başlatıldı.`, 'ok');
  } catch (err) {
    showSimResult('❌ Hata: ' + err.message, 'error');
  }
}

// Send Single Simulation Packet
async function sendSimulatorPacket(sim) {
  // Simüle hareket (yürüme) - lat/lng coordinates shift slightly
  if (sim.walk && sim.preset !== 'danger') {
    sim.lat += (Math.random() - 0.5) * 0.00018;
    sim.lng += (Math.random() - 0.5) * 0.00018;

    // Boundary check (BTÜ boundaries)
    if (sim.lat < CAMPUS_BOUNDS.getSouthWest().lat) sim.lat = CAMPUS_BOUNDS.getSouthWest().lat;
    if (sim.lat > CAMPUS_BOUNDS.getNorthEast().lat) sim.lat = CAMPUS_BOUNDS.getNorthEast().lat;
    if (sim.lng < CAMPUS_BOUNDS.getSouthWest().lng) sim.lng = CAMPUS_BOUNDS.getSouthWest().lng;
    if (sim.lng > CAMPUS_BOUNDS.getNorthEast().lng) sim.lng = CAMPUS_BOUNDS.getNorthEast().lng;
  }

  const payload = {
    device_id: sim.id,
    latitude: parseFloat(sim.lat.toFixed(6)),
    longitude: parseFloat(sim.lng.toFixed(6)),
    ...sim.customData()
  };

  try {
    const res = await apiRequest('/sensors/data', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    sim.packetsSent++;
    sim.lastStatus = res.anomalies > 0 ? `⚠️ ${res.anomalies} Anomali` : 'Normal';
    sim.lastStatusColor = res.anomalies > 0 ? '#f59e0b' : '#10b981';

    // If maxPackets reached, stop simulator
    if (sim.maxPackets > 0 && sim.packetsSent >= sim.maxPackets) {
      stopSimulator(sim.id);
    } else {
      updateSimsUI();
    }
  } catch (err) {
    console.error(`Sim packet fail for ${sim.name}:`, err);
    sim.lastStatus = 'Hata';
    sim.lastStatusColor = '#ef4444';
    updateSimsUI();
  }
}

// Stop Single Simulator
function stopSimulator(deviceId) {
  const sim = activeSimulators[deviceId];
  if (sim) {
    clearInterval(sim.intervalId);
    delete activeSimulators[deviceId];
    updateSimsUI();
    loadDevices();
  }
}

// Stop All Simulators
function stopAllSimulators() {
  Object.keys(activeSimulators).forEach(id => {
    clearInterval(activeSimulators[id].intervalId);
    delete activeSimulators[id];
  });
  updateSimsUI();
  loadDevices();
}

// Update Active Simulators Panel
function updateSimsUI() {
  const list = document.getElementById('activeSimsList');
  const countSpan = document.getElementById('activeSimCount');
  const stopAllBtn = document.getElementById('stopAllSimsBtn');
  
  const keys = Object.keys(activeSimulators);
  countSpan.textContent = keys.length;
  
  if (keys.length === 0) {
    list.innerHTML = `<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:12px 0;">Çalışan aktif test verisi gönderimi yok.</div>`;
    stopAllBtn.style.display = 'none';
    return;
  }

  stopAllBtn.style.display = 'block';
  
  list.innerHTML = keys.map(id => {
    const sim = activeSimulators[id];
    const packetProgress = sim.maxPackets > 0 ? `${sim.packetsSent} / ${sim.maxPackets}` : `${sim.packetsSent} paket`;
    const statusText = sim.lastStatus || 'Başlatılıyor';
    const color = sim.lastStatusColor || 'var(--text-secondary)';
    
    return `
      <div class="active-sim-card">
        <div class="active-sim-info">
          <div class="active-sim-name">${sim.name}</div>
          <div class="active-sim-stats">Aralık: ${sim.interval}s | Konum: ${sim.lat.toFixed(5)}, ${sim.lng.toFixed(5)}</div>
          <div class="active-sim-stats">Gönderilen: <strong style="color:var(--primary)">${packetProgress}</strong></div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:11px; font-weight:bold; color:${color}">${statusText}</span>
          <button class="btn btn-danger btn-sm" onclick="stopSimulator('${sim.id}')" style="padding:2px 6px; font-size:11px;">Durdur</button>
        </div>
      </div>
    `;
  }).join('');
}

function showSimResult(msg, type) {
  const el = document.getElementById('simResult');
  const colors = { ok: '#10b981', error: '#ef4444', warn: '#f59e0b' };
  el.style.color = colors[type] || 'var(--text-secondary)';
  el.textContent = msg;
  // Automatically clear success/warning logs after 6s
  setTimeout(() => {
    if (el.textContent === msg) el.textContent = '';
  }, 6000);
}

