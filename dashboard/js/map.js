let dashboardMap = null;
let deviceMarkers = {};
let zonePolygons = {};
let activeZoneAlerts = new Map();
let mapRefreshTimer = null;

const CAMPUS_CENTER = [40.1889, 29.1310];
const CAMPUS_ZOOM = 17;
const CAMPUS_BOUNDS = L.latLngBounds(
  [40.186121, 29.125768],
  [40.191767, 29.136281],
);

function initDashboardMap() {
  if (dashboardMap || !document.getElementById('dashboardMap')) return;
  dashboardMap = L.map('dashboardMap', {
    minZoom: 15,
    maxZoom: 19,
    maxBounds: CAMPUS_BOUNDS,
    maxBoundsViscosity: 1,
  }).setView(CAMPUS_CENTER, CAMPUS_ZOOM);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19,
  }).addTo(dashboardMap);

  loadMapData();
  mapRefreshTimer = window.setInterval(loadMapData, 15000);
}

function zoneHasActiveAlert(zoneId) {
  return (activeZoneAlerts.get(String(zoneId)) || 0) > 0;
}

function styleZone(zoneId) {
  const polygon = zonePolygons[zoneId];
  if (!polygon) return;
  const color = zoneHasActiveAlert(zoneId) ? '#ef4444' : polygon.defaultColor;
  polygon.setStyle({ color, fillColor: color, fillOpacity: zoneHasActiveAlert(zoneId) ? 0.35 : 0.15 });
}

function handleMapAlert(alert) {
  if (!alert?.zone_id) return;
  const zoneId = String(alert.zone_id);
  activeZoneAlerts.set(zoneId, (activeZoneAlerts.get(zoneId) || 0) + 1);
  styleZone(zoneId);
  playAlarmSound();
}

function handleMapAlertResolved(alert) {
  if (!alert?.zone_id) return;
  const zoneId = String(alert.zone_id);
  activeZoneAlerts.set(zoneId, Math.max((activeZoneAlerts.get(zoneId) || 1) - 1, 0));
  styleZone(zoneId);
}

function clearMapAlertHighlights() {
  activeZoneAlerts.clear();
  Object.keys(zonePolygons).forEach(styleZone);
}

async function loadMapData() {
  try {
    const [zonesResult, devicesResult, alertsResult] = await Promise.all([
      apiRequest('/zones'),
      apiRequest('/dashboard/live-devices'),
      apiRequest('/alerts?limit=200&resolved=false'),
    ]);
    if (!zonesResult || !devicesResult || !alertsResult) return;

    activeZoneAlerts = new Map();
    for (const alert of alertsResult.data || []) {
      if (!alert.zone_id) continue;
      const zoneId = String(alert.zone_id);
      activeZoneAlerts.set(zoneId, (activeZoneAlerts.get(zoneId) || 0) + 1);
    }

    Object.values(zonePolygons).forEach((polygon) => dashboardMap.removeLayer(polygon));
    zonePolygons = {};
    const typeLabels = { normal: 'Normal', restricted: 'Kisitli', danger: 'Tehlikeli' };
    for (const zone of zonesResult.data || []) {
      if (!zone.polygon || zone.polygon.length < 3) continue;
      const defaultColor = zone.color || '#3b82f6';
      const polygon = L.polygon(zone.polygon, {
        color: defaultColor,
        fillColor: defaultColor,
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(dashboardMap);
      polygon.defaultColor = defaultColor;
      polygon.bindPopup(
        `<b>${escapeHtml(zone.name)}</b><br>Tip: ${escapeHtml(typeLabels[zone.type] || zone.type)}`
        + `<br>Kapasite: ${escapeHtml(zone.max_capacity)}`,
      );
      zonePolygons[String(zone.id)] = polygon;
      styleZone(String(zone.id));
    }

    Object.values(deviceMarkers).forEach((marker) => dashboardMap.removeLayer(marker));
    deviceMarkers = {};
    for (const device of devicesResult.data || []) {
      if (device.last_latitude == null || device.last_longitude == null) continue;
      renderDeviceMarker({
        device_id: device.id,
        student_id: device.student_id || device.device_name,
        latitude: device.last_latitude,
        longitude: device.last_longitude,
        timestamp: device.last_seen,
        active_alerts: device.active_alerts || [],
      });
    }
  } catch (error) {
    console.error('Map data error:', error);
  }
}

function markerColors(alerts) {
  if (alerts.some((alert) => alert.severity === 'critical')) {
    return { color: '#ef4444', fillColor: '#f87171' };
  }
  if (alerts.some((alert) => String(alert.type || alert.alert_type).includes('noise'))) {
    return { color: '#f97316', fillColor: '#fb923c' };
  }
  if (alerts.length > 0) return { color: '#f59e0b', fillColor: '#fbbf24' };
  return { color: '#3b82f6', fillColor: '#60a5fa' };
}

function renderDeviceMarker(data) {
  const alerts = data.active_alerts || [];
  const colors = markerColors(alerts);
  const popup = `<b>Ogrenci: ${escapeHtml(data.student_id || '-')}</b>`
    + `<br>Gurultu: ${data.noise_level == null ? '-' : `${Number(data.noise_level).toFixed(1)} dB`}`
    + `<br>Hiz: ${data.speed == null ? '-' : `${Number(data.speed).toFixed(1)} km/h`}`
    + `<br>Guncelleme: ${new Date(data.timestamp || Date.now()).toLocaleString('tr-TR')}`
    + (alerts.length ? `<br><b>${alerts.length} aktif alarm</b>` : '');

  let marker = deviceMarkers[data.device_id];
  if (!marker) {
    marker = L.circleMarker([data.latitude, data.longitude], {
      radius: 10,
      ...colors,
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(dashboardMap);
    deviceMarkers[data.device_id] = marker;
    marker.bindPopup(popup);
    return;
  }
  marker.setLatLng([data.latitude, data.longitude]);
  marker.setStyle(colors);
  marker.setPopupContent(popup);
}

function updateDeviceOnMap(data) {
  if (!dashboardMap || data.latitude == null || data.longitude == null) return;
  renderDeviceMarker(data);
}

function playAlarmSound() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.linearRampToValueAtTime(440, context.currentTime + 0.5);
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.7);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.7);
  } catch (error) {
    console.error('Alarm sound error:', error);
  }
}

function refreshMap() {
  loadMapData();
}
