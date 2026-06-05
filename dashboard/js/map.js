// CampusGuard - Leaflet Map
let dashboardMap = null;
let deviceMarkers = {};
let zonePolygons = [];

const CAMPUS_CENTER = [40.2226, 28.8700];
const CAMPUS_ZOOM = 16;

function initDashboardMap() {
  if (dashboardMap) return;
  const el = document.getElementById('dashboardMap');
  if (!el) return;

  dashboardMap = L.map('dashboardMap').setView(CAMPUS_CENTER, CAMPUS_ZOOM);
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
      // Clear old polygons
      zonePolygons.forEach(p => dashboardMap.removeLayer(p));
      zonePolygons = [];

      zonesRes.data.forEach(zone => {
        if (zone.polygon && zone.polygon.length >= 3) {
          const poly = L.polygon(zone.polygon, {
            color: zone.color || '#3b82f6',
            fillColor: zone.color || '#3b82f6',
            fillOpacity: 0.15,
            weight: 2
          }).addTo(dashboardMap);
          poly.bindPopup(`<b>${zone.name}</b><br>Tip: ${zone.type}<br>Kapasite: ${zone.max_capacity}`);
          zonePolygons.push(poly);
        }
      });
    }

    // Load live devices
    const devRes = await apiRequest('/dashboard/live-devices');
    if (devRes && devRes.data) {
      // Clear old markers
      Object.values(deviceMarkers).forEach(m => dashboardMap.removeLayer(m));
      deviceMarkers = {};

      devRes.data.forEach(dev => {
        if (dev.last_latitude && dev.last_longitude) {
          const marker = L.circleMarker([dev.last_latitude, dev.last_longitude], {
            radius: 8,
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.8,
            weight: 2
          }).addTo(dashboardMap);
          marker.bindPopup(`<b>${dev.device_name}</b><br>Son: ${new Date(dev.last_seen).toLocaleString('tr-TR')}`);
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
  } else {
    const marker = L.circleMarker([data.latitude, data.longitude], {
      radius: 8, color: '#3b82f6', fillColor: '#60a5fa', fillOpacity: 0.8, weight: 2
    }).addTo(dashboardMap);
    deviceMarkers[data.device_id] = marker;
  }
}

function refreshMap() {
  loadMapData();
}
