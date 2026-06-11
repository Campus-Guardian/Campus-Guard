// CampusGuard - Leaflet Map — BTÜ Mimar Sinan Yerleşkesi
let dashboardMap = null;
let deviceMarkers = {};
let zonePolygons = [];

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

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19
  }).addTo(dashboardMap);

  loadMapData();
  // Refresh every 15 seconds
  setInterval(loadMapData, 15000);
}

async function loadMapData() {
  try {
    // Load zones
    const zonesRes = await apiRequest('/zones');
    if (zonesRes && zonesRes.data) {
      zonePolygons.forEach(p => dashboardMap.removeLayer(p));
      zonePolygons = [];

      zonesRes.data.forEach(zone => {
        if (zone.polygon && zone.polygon.length >= 3) {
          const typeLabel = { normal: 'Normal', restricted: 'Kısıtlı', danger: 'Tehlikeli' };
          const poly = L.polygon(zone.polygon, {
            color: zone.color || '#3b82f6',
            fillColor: zone.color || '#3b82f6',
            fillOpacity: 0.15,
            weight: 2
          }).addTo(dashboardMap);
          poly.bindPopup(`<b>${zone.name}</b><br>Tip: ${typeLabel[zone.type] || zone.type}<br>Kapasite: ${zone.max_capacity}`);
          zonePolygons.push(poly);
        }
      });
    }

    // Load live devices
    const devRes = await apiRequest('/dashboard/live-devices');
    if (devRes && devRes.data) {
      Object.values(deviceMarkers).forEach(m => dashboardMap.removeLayer(m));
      deviceMarkers = {};

      devRes.data.forEach(dev => {
        if (dev.last_latitude && dev.last_longitude) {
          const marker = L.circleMarker([dev.last_latitude, dev.last_longitude], {
            radius: 10,
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.9,
            weight: 2
          }).addTo(dashboardMap);
          marker.bindPopup(
            `<b>${dev.device_name}</b><br>` +
            `Son görülme: ${new Date(dev.last_seen).toLocaleString('tr-TR')}<br>` +
            `Konum: ${dev.last_latitude.toFixed(5)}, ${dev.last_longitude.toFixed(5)}`
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

function refreshMap() {
  loadMapData();
}
