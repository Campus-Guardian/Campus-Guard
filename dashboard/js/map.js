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

    // Load live devices (now includes active_alerts and student_id)
    const devRes = await apiRequest('/dashboard/live-devices');
    if (devRes && devRes.data) {
      Object.values(deviceMarkers).forEach(m => dashboardMap.removeLayer(m));
      deviceMarkers = {};

      devRes.data.forEach(dev => {
        if (dev.last_latitude && dev.last_longitude) {
          // Alarm durumuna göre renk
          let markerColor = '#3b82f6';  // varsayılan: mavi
          let fillColor = '#60a5fa';
          const alerts = dev.active_alerts || [];
          
          if (alerts.some(a => a.severity === 'critical')) {
            markerColor = '#ef4444'; fillColor = '#f87171'; // kırmızı
          } else if (alerts.some(a => a.type && a.type.includes('noise'))) {
            markerColor = '#f97316'; fillColor = '#fb923c'; // turuncu
          } else if (alerts.length > 0) {
            markerColor = '#f59e0b'; fillColor = '#fbbf24'; // sarı
          }

          const marker = L.circleMarker([dev.last_latitude, dev.last_longitude], {
            radius: 10,
            color: markerColor,
            fillColor: fillColor,
            fillOpacity: 0.9,
            weight: 2
          }).addTo(dashboardMap);

          const alertBadge = alerts.length > 0
            ? `<br><span style="color:${markerColor};font-weight:bold">⚠️ ${alerts.length} aktif alarm</span>`
            : '';
          const studentInfo = dev.student_id ? `<br>Öğrenci: ${dev.student_id}` : '';

          marker.bindPopup(
            `<b>${dev.device_name}</b>${studentInfo}` +
            `<br>Son görülme: ${new Date(dev.last_seen).toLocaleString('tr-TR')}` +
            `<br>Konum: ${dev.last_latitude.toFixed(5)}, ${dev.last_longitude.toFixed(5)}` +
            alertBadge
          );
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
  if (deviceMarkers[data.device_id]) {
    deviceMarkers[data.device_id].setLatLng([data.latitude, data.longitude]);
    deviceMarkers[data.device_id].setPopupContent(
      `<b>Cihaz</b><br>` +
      `Gürültü: ${data.noise_level ? data.noise_level.toFixed(1) + ' dB' : '-'}<br>` +
      `Hız: ${data.speed ? data.speed.toFixed(1) + ' km/h' : '-'}<br>` +
      `Güncelleme: ${new Date(data.timestamp || Date.now()).toLocaleTimeString('tr-TR')}`
    );
  } else {
    const marker = L.circleMarker([data.latitude, data.longitude], {
      radius: 10, color: '#3b82f6', fillColor: '#60a5fa', fillOpacity: 0.9, weight: 2
    }).addTo(dashboardMap);
    deviceMarkers[data.device_id] = marker;
  }
}

function setupMapSocketListeners() {
  if (typeof io !== 'undefined') {
    const checkSocket = setInterval(() => {
      if (window.socket) {
        clearInterval(checkSocket);
        
        window.socket.on('new-alert', (alert) => {
          if ((alert.alert_type === 'restricted_zone' || alert.alert_type === 'danger_zone') && alert.zone_id) {
            zoneAlertCounters[alert.zone_id] = 0;
            const poly = zonePolygons[alert.zone_id];
            if (poly) {
              poly.setStyle({ color: '#ef4444', fillColor: '#ef4444' });
            }
          }
        });

        window.socket.on('sensor-update', (data) => {
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

function refreshMap() {
  loadMapData();
}
