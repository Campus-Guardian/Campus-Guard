// CampusGuard - Devices Page + Simulator
let simMap = null;
let simMarker = null;
let simLat = null;
let simLng = null;
let allZones = []; // tüm bölgeler (normal, restricted, danger)

let bulkSimMap = null; // Bulk sekme haritası

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
        <td><strong>${d.student_id || '-'}</strong></td>
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
  await loadAllZones();
  initSimMap();
}

async function openSimForDevice(deviceId, studentId) {
  document.getElementById('simModal').classList.add('show');
  await loadAllZones();
  initSimMap();
}

// Tüm bölgeleri yükle (filtre yok)
async function loadAllZones() {
  try {
    const res = await apiRequest('/zones');
    if (!res || !res.data) return;
    allZones = res.data; // tüm tipler: normal, restricted, danger

    // Tek cihaz sekmesi: "Bölgeye gönder" butonları
    const container = document.getElementById('dangerZonesBtns');
    if (allZones.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Her bölgeye uygun renk sınıfı
    const btnClass = (type) => {
      if (type === 'danger') return 'zone-btn-danger';
      if (type === 'restricted') return 'zone-btn-restricted';
      return 'zone-btn-normal';
    };

    container.innerHTML = '<span style="font-size:11px;color:var(--text-muted);align-self:center">Bölgeye gönder:</span>' +
      allZones.map(z =>
        `<button class="dz-btn ${btnClass(z.type)}" onclick="jumpToZone('${z.id}')">${z.name}</button>`
      ).join('');

    // Bulk sekmesi: checkbox listesi
    renderBulkZoneCheckboxes();
  } catch (err) { console.error(err); }
}

function renderBulkZoneCheckboxes() {
  const container = document.getElementById('bulkZoneCheckboxes');
  if (!container) return;

  if (allZones.length === 0) {
    container.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">Bölge bulunamadı</span>';
    return;
  }

  const typeLabel = { normal: 'Normal', restricted: 'Kısıtlı', danger: 'Tehlikeli' };
  const typeColor = { normal: '#3b82f6', restricted: '#f59e0b', danger: '#ef4444' };

  container.innerHTML = allZones.map(z => `
    <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:3px 0;">
      <input type="checkbox" class="bulk-zone-cb" value="${z.id}" style="width:14px;height:14px;">
      <span style="width:10px;height:10px;border-radius:50%;background:${typeColor[z.type] || '#888'};display:inline-block;flex-shrink:0;"></span>
      <span style="color:var(--text-primary)">${z.name}</span>
      <span style="color:var(--text-muted);font-size:10px;">[${typeLabel[z.type] || z.type}]</span>
    </label>
  `).join('');
}

function selectAllBulkZones() {
  document.querySelectorAll('.bulk-zone-cb').forEach(cb => cb.checked = true);
}

function clearAllBulkZones() {
  document.querySelectorAll('.bulk-zone-cb').forEach(cb => cb.checked = false);
}

function getSelectedBulkZones() {
  const selected = [];
  document.querySelectorAll('.bulk-zone-cb:checked').forEach(cb => {
    const zone = allZones.find(z => z.id === cb.value);
    if (zone) selected.push(zone);
  });
  return selected;
}

function jumpToZone(zoneId) {
  const zone = allZones.find(z => z.id === zoneId);
  if (!zone || !zone.polygon || zone.polygon.length === 0) return;
  // Polygon merkezi hesapla
  const lats = zone.polygon.map(p => p[0]);
  const lngs = zone.polygon.map(p => p[1]);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
  setSimLocation(centerLat, centerLng);
  simMap.setView([centerLat, centerLng], 18);
}

// Polygon içinde rastgele nokta üret
function randomPointInPolygon(polygon) {
  const lats = polygon.map(p => p[0]);
  const lngs = polygon.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  let attempts = 0;
  while (attempts < 100) {
    const lat = minLat + Math.random() * (maxLat - minLat);
    const lng = minLng + Math.random() * (maxLng - minLng);
    if (isPointInPolygon([lat, lng], polygon)) return [lat, lng];
    attempts++;
  }
  // Fallback: merkez
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
  return [centerLat, centerLng];
}

// Ray-casting algoritması
function isPointInPolygon(point, polygon) {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
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

    // Tüm bölgeleri göster (tip rengine göre)
    const zoneColors = { normal: '#3b82f6', restricted: '#f59e0b', danger: '#ef4444' };
    allZones.forEach(z => {
      if (z.polygon && z.polygon.length >= 3) {
        const color = zoneColors[z.type] || z.color || '#3b82f6';
        L.polygon(z.polygon, { color, fillOpacity: 0.15, weight: 1.5 })
          .addTo(simMap)
          .bindPopup(`<b>${z.name}</b><br><small>${z.type}</small>`);
      }
    });

    simMap.on('click', (e) => {
      setSimLocation(e.latlng.lat, e.latlng.lng);
    });
  }, 200);
}

function initBulkSimMap() {
  if (bulkSimMap) {
    bulkSimMap.invalidateSize();
    return;
  }

  setTimeout(() => {
    bulkSimMap = L.map('bulkSimMap', {
      minZoom: 15,
      maxZoom: 19,
      maxBounds: CAMPUS_BOUNDS,
      maxBoundsViscosity: 1.0
    }).setView(CAMPUS_CENTER, 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO', maxZoom: 19
    }).addTo(bulkSimMap);

    // Tüm bölgeleri göster
    const zoneColors = { normal: '#3b82f6', restricted: '#f59e0b', danger: '#ef4444' };
    allZones.forEach(z => {
      if (z.polygon && z.polygon.length >= 3) {
        const color = zoneColors[z.type] || z.color || '#3b82f6';
        L.polygon(z.polygon, { color, fillOpacity: 0.15, weight: 1.5 })
          .addTo(bulkSimMap)
          .bindPopup(`<b>${z.name}</b><br><small>${z.type}</small>`);
      }
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
    // Bulk haritasını başlat
    initBulkSimMap();
  }
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
  } catch (err) {
    showSimResult('❌ Hata: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '🗑️ Grubu Temizle';
  }
}

// Start Single Device Simulation
async function startSingleSim() {
  if (!simLat || !simLng) return showSimResult('Lütfen haritadan bir konum seçin', 'error');

  const btn = document.getElementById('simSendBtn');
  btn.disabled = true;
  btn.textContent = 'Cihaz oluşturuluyor...';

  try {
    const res = await apiRequest('/simulator/generate', {
      method: 'POST',
      body: JSON.stringify({ count: 1 })
    });

    if (!res || !res.devices || res.devices.length === 0) {
      throw new Error('Test cihazı oluşturulamadı.');
    }

    const device = res.devices[0];
    const deviceId = device.id;
    const deviceName = device.device_name;

    const intervalSeconds = parseInt(document.getElementById('simInterval').value) || 5;
    const maxPackets = parseInt(document.getElementById('simMaxPackets').value) || 0;
    const walkEffect = document.getElementById('simWalkEffect').checked;

    // =====================================================
    // DÜZELTME: Sensör değerlerini ŞIMDI anlık al ve sakla
    // Böylece bu simülatör, sonraki slider değişikliklerinden
    // veya sıfırlamalardan BAĞIMSIZ çalışır.
    // =====================================================
    const snapshotData = {
      noise_level: parseFloat(document.getElementById('simNoise').value),
      acceleration_x: parseFloat(document.getElementById('simAccX').value),
      acceleration_y: parseFloat(document.getElementById('simAccY').value),
      acceleration_z: parseFloat(document.getElementById('simAccZ').value),
      speed: parseFloat(document.getElementById('simSpeed').value),
      battery_level: parseInt(document.getElementById('simBattery').value),
      network_type: '4g'
    };

    if (activeSimulators[deviceId]) {
      stopSimulator(deviceId);
    }

    // Create simulator configuration with FROZEN snapshot values
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
      // Her çağrıda sabit snapshot değerlerini döndür (DOM bağımsız)
      customData: () => ({
        noise_level: snapshotData.noise_level,
        acceleration_x: snapshotData.acceleration_x,
        acceleration_y: snapshotData.acceleration_y,
        acceleration_z: snapshotData.acceleration_z,
        speed: snapshotData.speed,
        battery_level: snapshotData.battery_level,
        network_type: snapshotData.network_type
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
    await loadDevices();

    // Reset UI to default (artık snapshot alındı, sıfırlama güvenli)
    if (simMarker) {
      simMap.removeLayer(simMarker);
      simMarker = null;
    }
    simLat = null;
    simLng = null;
    document.getElementById('simCoordsDisplay').textContent = 'Haritaya tıklayarak konum seçin';

    // Reset controls
    document.getElementById('simNoise').value = 55;
    document.getElementById('simNoiseVal').textContent = '55 dB';

    document.getElementById('simAccX').value = 0;
    document.getElementById('simAccXVal').textContent = '0 m/s²';

    document.getElementById('simAccY').value = 0;
    document.getElementById('simAccYVal').textContent = '0 m/s²';

    document.getElementById('simAccZ').value = 9.8;
    document.getElementById('simAccZVal').textContent = '9.8 m/s²';

    document.getElementById('simSpeed').value = 0;
    document.getElementById('simSpeedVal').textContent = '0 km/h';

    document.getElementById('simBattery').value = 80;
    document.getElementById('simBatteryVal').textContent = '80%';

    document.getElementById('simWalkEffect').checked = true;

    showSimResult(`📡 ${deviceName} oluşturuldu | Gürültü: ${snapshotData.noise_level}dB | Hız: ${snapshotData.speed}km/h | Batarya: ${snapshotData.battery_level}%`, 'ok');
  } catch (err) {
    showSimResult('❌ Hata: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📡 Simülasyonu Başlat';
  }
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

    // Seçili bölgeler
    const selectedZones = getSelectedBulkZones();

    let startedCount = 0;

    testDevices.forEach((d, idx) => {
      if (activeSimulators[d.id]) {
        stopSimulator(d.id);
      }

      // Bölge seçildiyse round-robin ile dağıt
      let deviceLat, deviceLng;
      if (selectedZones.length > 0) {
        const zone = selectedZones[idx % selectedZones.length];
        if (zone.polygon && zone.polygon.length >= 3) {
          const pt = randomPointInPolygon(zone.polygon);
          deviceLat = pt[0];
          deviceLng = pt[1];
        } else {
          const lats = (zone.polygon || []).map(p => p[0]);
          const lngs = (zone.polygon || []).map(p => p[1]);
          deviceLat = lats.length ? lats.reduce((a,b)=>a+b,0)/lats.length : CAMPUS_CENTER[0];
          deviceLng = lngs.length ? lngs.reduce((a,b)=>a+b,0)/lngs.length : CAMPUS_CENTER[1];
        }
      } else {
        // Bölge seçilmediyse kampüs genelinde rastgele
        deviceLat = d.last_latitude || (CAMPUS_CENTER[0] + (Math.random() - 0.5) * 0.003);
        deviceLng = d.last_longitude || (CAMPUS_CENTER[1] + (Math.random() - 0.5) * 0.003);
      }

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
              if (allZones && allZones.length > 0) {
                const dangerZone = allZones.find(z => z.type === 'danger') || allZones[0];
                if (dangerZone.polygon && dangerZone.polygon.length > 0) {
                  const lats = dangerZone.polygon.map(p => p[0]);
                  const lngs = dangerZone.polygon.map(p => p[1]);
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
    const zoneInfo = selectedZones.length > 0 ? ` (${selectedZones.length} bölgeye dağıtıldı)` : '';
    showSimResult(`🚀 ${startedCount} test cihazı için toplu simülasyon başlatıldı${zoneInfo}.`, 'ok');
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
    apiRequest('/devices/' + deviceId, { method: 'DELETE' })
      .then(() => loadDevices())
      .catch(err => console.error('Error deleting test device:', err));
    delete activeSimulators[deviceId];
    updateSimsUI();
    loadDevices();
  }
}

// Stop All Simulators
function stopAllSimulators() {
  Object.keys(activeSimulators).forEach(id => {
    clearInterval(activeSimulators[id].intervalId);
    apiRequest('/devices/' + id, { method: 'DELETE' })
      .catch(err => console.error('Error deleting test device:', err));
    delete activeSimulators[id];
  });
  setTimeout(loadDevices, 1000);
  updateSimsUI();
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
