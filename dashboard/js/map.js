// CampusGuard - Leaflet Map — BTÜ Mimar Sinan Yerleşkesi
let dashboardMap = null;
let deviceMarkers = {};
let zonePolygons = {};
let zoneAlertCounters = {};

const CAMPUS_CENTER = [40.1889, 29.1310];
const CAMPUS_ZOOM = 17;

// BTÜ Mimar Sinan Yerleşkesi gerçek sınırları
const CAMPUS_BOUNDS = L.latLngBounds(
  [40.186121, 29.125768], // Güneybatı (sol-alt)
  [40.191767, 29.136281]  // Kuzeydoğu (sağ-üst)
);

function initDashboardMap() {
  if (dashboardMap) return;
  const el = document.getElementById('dashboardMap');
  if (!el) return;

  dashboardMap = L.map('dashboardMap', {
    minZoom: 15,
    maxZoom: 19,
    maxBounds: CAMPUS_BOUNDS,
    maxBoundsViscosity: 1.0
  }).setView(CAMPUS_CENTER, CAMPUS_ZOOM);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19
  }).addTo(dashboardMap);

  loadMapData();
  // Refresh every 15 seconds
  setInterval(loadMapData, 15000);

  // Set up socket listeners for zone alerts dynamic coloring
  setupMapSocketListeners();
}

async function loadMapData() {
  try {
    // Load zones
    const zonesRes = await apiRequest('/zones');
    if (zonesRes && zonesRes.data) {
      Object.values(zonePolygons).forEach(p => dashboardMap.removeLayer(p));
      zonePolygons = {};

      zonesRes.data.forEach(zone => {
        if (zone.polygon && zone.polygon.length >= 3) {
          const typeLabel = { normal: 'Normal', restricted: 'Kısıtlı', danger: 'Tehlikeli' };

          // Determine color based on active alert counter
          let currentColor = zone.color || '#3b82f6';
          if (zoneAlertCounters[zone.id] !== undefined && zoneAlertCounters[zone.id] < 5) {
            currentColor = '#ef4444'; // Keep it red if alert is active
          } else if (zoneAlertCounters[zone.id] === undefined) {
            zoneAlertCounters[zone.id] = 5; // Default to clean state
          }

          const poly = L.polygon(zone.polygon, {
            color: currentColor,
            fillColor: currentColor,
            fillOpacity: 0.15,
            weight: 2
          }).addTo(dashboardMap);
          poly.bindPopup(`<b>${zone.name}</b><br>Tip: ${typeLabel[zone.type] || zone.type}<br>Kapasite: ${zone.max_capacity}`);

          poly.defaultColor = zone.color || '#3b82f6';
          poly.zoneType = zone.type;
          zonePolygons[zone.id] = poly;
        }
      });
    }

    // Load live devices (now includes active_alerts, student_id and emergency_type)
    const devRes = await apiRequest('/dashboard/live-devices');
    if (devRes && devRes.data) {
      Object.values(deviceMarkers).forEach(m => dashboardMap.removeLayer(m));
      deviceMarkers = {};

      devRes.data.forEach(dev => {
        if (dev.last_latitude && dev.last_longitude) {
          const alerts = dev.active_alerts || [];
          const isEmergency = !!dev.emergency_type;

          // ===== Renk Öncelik Sırası =====
          // 1. Acil durum → parlak kırmızı + büyük
          // 2. Kritik alarm → kırmızı
          // 3. Gürültü → turuncu
          // 4. Diğer alarm → sarı
          // 5. Normal → mavi
          let markerColor = '#3b82f6';
          let fillColor   = '#60a5fa';
          let radius      = 10;
          let weight      = 2;

          if (isEmergency) {
            markerColor = '#dc2626';
            fillColor   = '#ef4444';
            radius      = 16;
            weight      = 3;
          } else if (alerts.some(a => a.severity === 'critical')) {
            markerColor = '#ef4444'; fillColor = '#f87171';
          } else if (alerts.some(a => a.type && a.type.includes('noise'))) {
            markerColor = '#f97316'; fillColor = '#fb923c';
          } else if (alerts.length > 0) {
            markerColor = '#f59e0b'; fillColor = '#fbbf24';
          }

          const marker = L.circleMarker([dev.last_latitude, dev.last_longitude], {
            radius,
            color: markerColor,
            fillColor,
            fillOpacity: 0.9,
            weight,
            // Acil durum markerı için özel CSS sınıfı (nabız animasyonu)
            className: isEmergency ? 'emergency-pulse' : ''
          }).addTo(dashboardMap);

          // Acil durum popup içeriği
          let popupHtml = '';
          if (isEmergency) {
            const eCat = dev.emergency_type === 'emergency_health' ? '🏥 Sağlık' : '🔒 Güvenlik';
            popupHtml =
              `<div style="font-size:13px;line-height:1.6">` +
              `<b style="color:#dc2626;font-size:14px">🚨 ACİL DURUM [${eCat}]</b><br>` +
              `<b>Öğrenci No: ${dev.student_id || dev.device_name}</b><br>` +
              `Son görülme: ${new Date(dev.last_seen).toLocaleString('tr-TR')}<br>` +
              `Konum: ${dev.last_latitude.toFixed(5)}, ${dev.last_longitude.toFixed(5)}` +
              `</div>`;
          } else {
            const alertBadge = alerts.length > 0
              ? `<br><span style="color:${markerColor};font-weight:bold">⚠️ ${alerts.length} aktif alarm</span>`
              : '';
            popupHtml =
              `<b>Öğrenci No: ${dev.student_id || dev.device_name}</b>` +
              `<br>Son görülme: ${new Date(dev.last_seen).toLocaleString('tr-TR')}` +
              `<br>Konum: ${dev.last_latitude.toFixed(5)}, ${dev.last_longitude.toFixed(5)}` +
              alertBadge;
          }

          marker.bindPopup(popupHtml);
          if (isEmergency) {
            marker._isEmergency = true; // updateDeviceOnMap bu bayrağı kontrol eder
            marker.openPopup();
          }
          deviceMarkers[dev.id] = marker;
        }
      });
    }

  } catch (err) {
    console.error('Map data error:', err);
  }
}

function updateDeviceOnMap(data) {
  if (!dashboardMap || !data.latitude || !data.longitude) return;

  // Mevcut marker acil durum marker'ıysa (büyük kırmızı) — dokunma, tam yenileme bekle
  const existingMarker = deviceMarkers[data.device_id];
  if (existingMarker && existingMarker._isEmergency) {
    // Sadece konumu güncelle, rengi ve boyutu koru
    existingMarker.setLatLng([data.latitude, data.longitude]);
    return;
  }

  // Determine marker color in real-time based on active packet alerts
  const alerts = data.active_alerts || [];
  let markerColor = '#3b82f6';  // default blue
  let fillColor = '#60a5fa';

  if (alerts.length > 0) {
    if (alerts.some(a => a.severity === 'critical')) {
      markerColor = '#ef4444'; fillColor = '#f87171'; // red
    } else if (alerts.some(a => (a.type || a.alert_type || '').includes('noise'))) {
      markerColor = '#f97316'; fillColor = '#fb923c'; // orange
    } else {
      markerColor = '#f59e0b'; fillColor = '#fbbf24'; // yellow
    }
  }

  const popupContent =
    `<b>Öğrenci No: ${data.student_id || '-'}</b><br>` +
    `Gürültü: ${data.noise_level ? data.noise_level.toFixed(1) + ' dB' : '-'}<br>` +
    `Hız: ${data.speed ? data.speed.toFixed(1) + ' km/h' : '-'}<br>` +
    `Güncelleme: ${new Date(data.timestamp || Date.now()).toLocaleTimeString('tr-TR')}`;

  if (existingMarker) {
    existingMarker.setLatLng([data.latitude, data.longitude]);
    existingMarker.setStyle({ color: markerColor, fillColor: fillColor });
    existingMarker.setPopupContent(popupContent);
  } else {
    const marker = L.circleMarker([data.latitude, data.longitude], {
      radius: 10, color: markerColor, fillColor: fillColor, fillOpacity: 0.9, weight: 2
    }).addTo(dashboardMap);
    deviceMarkers[data.device_id] = marker;
    marker.bindPopup(popupContent);
  }
}

function playAlarmSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Play a high attention dual-tone siren
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.4);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.8);
    osc2.stop(ctx.currentTime + 0.8);
  } catch (e) {
    console.error('Failed to play alarm sound:', e);
  }
}

function setupMapSocketListeners() {
  if (typeof io !== 'undefined') {
    const checkSocket = setInterval(() => {
      if (window.socket) {
        clearInterval(checkSocket);

        window.socket.on('new-alert', (alert) => {
          // Play warning siren sound
          playAlarmSound();

          // Animasyonlu kırmızı daire — cihaz marker'ı varsa onun konumuna, yoksa alert.location'a bak
          const tryShowPulse = (lat, lng) => {
            if (lat && lng) showAlertPulseOnMap(lat, lng);
          };

          // 1) alert içinde konum bilgisi var mı?
          if (alert.latitude && alert.longitude) {
            tryShowPulse(alert.latitude, alert.longitude);
          } else if (alert.device_id && deviceMarkers[alert.device_id]) {
            // 2) cihazın mevcut marker'ından al
            const pos = deviceMarkers[alert.device_id].getLatLng();
            tryShowPulse(pos.lat, pos.lng);
          } else {
            // 3) Tüm cihaz marker'larına göster (cihaz bilgisi yoksa)
            Object.values(deviceMarkers).forEach(m => {
              const pos = m.getLatLng();
              tryShowPulse(pos.lat, pos.lng);
            });
          }

          if ((alert.alert_type === 'restricted_zone' || alert.alert_type === 'danger_zone') && alert.zone_id) {
            zoneAlertCounters[alert.zone_id] = 0;
            const poly = zonePolygons[alert.zone_id];
            if (poly) {
              poly.setStyle({ color: '#ef4444', fillColor: '#ef4444' });
            }
          }
        });

        // Acil durum alarmı → haritayı hemen yenile + nabız animasyonu
        window.socket.on('emergency-alert', (alert) => {
          loadMapData();
          // Acil durum için de kırmızı nabız dairesi göster
          if (alert && alert.latitude && alert.longitude) {
            showAlertPulseOnMap(alert.latitude, alert.longitude);
          } else if (alert && alert.device_id && deviceMarkers[alert.device_id]) {
            const pos = deviceMarkers[alert.device_id].getLatLng();
            showAlertPulseOnMap(pos.lat, pos.lng);
          }
        });

        window.socket.on('sensor-update', (data) => {
          // Update device marker coordinates and real-time color styling
          updateDeviceOnMap(data);

          // Her yeni sensör verisinde, alarmı olan bölgelerin sayaçlarını artırıyoruz.
          // 5 paket boyunca yeni alarm gelmezse rengi varsayılana döndürüyoruz.
          Object.keys(zoneAlertCounters).forEach(zoneId => {
            if (zoneAlertCounters[zoneId] < 5) {
              zoneAlertCounters[zoneId]++;
              if (zoneAlertCounters[zoneId] >= 5) {
                const poly = zonePolygons[zoneId];
                if (poly) {
                  poly.setStyle({ color: poly.defaultColor, fillColor: poly.defaultColor });
                }
              }
            }
          });
        });
      }
    }, 100);
  }
}

// ========= Alarm Nabız Animasyonu =========
let alertPulseCircles = [];

function showAlertPulseOnMap(lat, lng) {
  if (!dashboardMap) return;

  // CSS animasyonu bir kere ekle
  if (!document.getElementById('_pulseCircleStyle')) {
    const style = document.createElement('style');
    style.id = '_pulseCircleStyle';
    style.innerHTML = `
      @keyframes leaflet-pulse-ring {
        0%   { transform: scale(0.4); opacity: 0.9; }
        80%  { transform: scale(2.8); opacity: 0; }
        100% { transform: scale(2.8); opacity: 0; }
      }
      .leaflet-pulse-circle {
        border-radius: 50%;
        border: 4px solid #ef4444;
        background: rgba(239,68,68,0.25);
        animation: leaflet-pulse-ring 1.2s cubic-bezier(0.215,0.61,0.355,1) infinite;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  // 3 iç içe pulsing daire (farklı gecikmelerle)
  const circles = [0, 400, 800].map(delay => {
    const icon = L.divIcon({
      className: '',
      html: `<div class="leaflet-pulse-circle" style="width:60px;height:60px;animation-delay:${delay}ms"></div>`,
      iconSize: [60, 60],
      iconAnchor: [30, 30]
    });
    const m = L.marker([lat, lng], { icon, zIndexOffset: -1000, interactive: false }).addTo(dashboardMap);
    return m;
  });

  alertPulseCircles.push(...circles);

  // 6 saniye sonra kaldır
  setTimeout(() => {
    circles.forEach(c => { try { dashboardMap.removeLayer(c); } catch (_) {} });
    alertPulseCircles = alertPulseCircles.filter(c => !circles.includes(c));
  }, 6000);
}

function refreshMap() {
  loadMapData();
}
