// CampusGuard - Zones Page — BTÜ Mimar Sinan Yerleşkesi
let zonesMap = null;
let drawnItems = null;
let drawControl = null;
let currentPolygon = null;

// BTÜ koordinatları
const CAMPUS = [40.1889, 29.1310];
const CAMPUS_ZOOM = 17;
const CAMPUS_BOUNDS = L.latLngBounds(
  [40.186121, 29.125768], // Güneybatı (sol-alt)
  [40.191767, 29.136281]  // Kuzeydoğu (sağ-üst)
);

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  initZonesMap();
  refreshZones();
});

function initZonesMap() {
  zonesMap = L.map('zonesMap', {
    minZoom: 15,
    maxZoom: 19,
    maxBounds: CAMPUS_BOUNDS,
    maxBoundsViscosity: 1.0
  }).setView(CAMPUS, CAMPUS_ZOOM);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &copy; CARTO', maxZoom: 19
  }).addTo(zonesMap);

  drawnItems = new L.FeatureGroup();
  zonesMap.addLayer(drawnItems);

  const user = getUser();
  if (user && user.role === 'admin') {
    drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#3b82f6', weight: 2, fillOpacity: 0.3 }
        },
        polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false
      },
      edit: { featureGroup: drawnItems }
    });
    zonesMap.addControl(drawControl);

    zonesMap.on(L.Draw.Event.CREATED, (e) => {
      // Önceki çizimi temizle
      drawnItems.clearLayers();
      const layer = e.layer;
      drawnItems.addLayer(layer);

      // getLatLngs()[0] — dış halka
      const latlngs = layer.getLatLngs()[0].map(ll => [ll.lat, ll.lng]);
      currentPolygon = latlngs;

      // Formu göster ve rengi otomatik bölge tipine göre ayarla
      document.getElementById('zoneFormCard').style.display = 'block';
      document.getElementById('zoneName').focus();
      updateZoneColor();
    });

    // Düzenleme tamamlandığında da polygon'u güncelle
    zonesMap.on(L.Draw.Event.EDITED, (e) => {
      e.layers.eachLayer(layer => {
        if (layer instanceof L.Polygon) {
          currentPolygon = layer.getLatLngs()[0].map(ll => [ll.lat, ll.lng]);
        }
      });
    });
  }
}

function updateZoneColor() {
  const type = document.getElementById('zoneType').value;
  const colors = { normal: '#3b82f6', restricted: '#f59e0b', danger: '#ef4444' };
  document.getElementById('zoneColor').value = colors[type] || '#3b82f6';
}

async function refreshZones() {
  try {
    const res = await apiRequest('/zones');
    if (!res || !res.data) return;

    // Haritadan eski bölgeleri temizle (drawnItems hariç)
    zonesMap.eachLayer(l => {
      if (l instanceof L.Polygon && !drawnItems.hasLayer(l)) {
        zonesMap.removeLayer(l);
      }
    });

    const list = document.getElementById('zoneList');
    if (res.data.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">🗺️</div><p>Henüz bölge tanımlanmamış.<br>Harita üzerinde polygon çizerek bölge ekleyin.</p></div>';
      return;
    }

    const typeLabel = { normal: 'Normal', restricted: 'Kısıtlı', danger: 'Tehlikeli' };

    res.data.forEach(z => {
      if (z.polygon && z.polygon.length >= 3) {
        const poly = L.polygon(z.polygon, {
          color: z.color || '#3b82f6',
          fillColor: z.color || '#3b82f6',
          fillOpacity: 0.2,
          weight: 2
        }).addTo(zonesMap);
        poly.bindPopup(
          `<b>${z.name}</b><br>` +
          `Tip: ${typeLabel[z.type] || z.type}<br>` +
          `Kapasite: ${z.max_capacity}<br>` +
          `${z.description ? 'Not: ' + z.description : ''}`
        );
      }
    });

    const user = getUser();
    const isAdmin = user && user.role === 'admin';

    list.innerHTML = res.data.map(z => `
      <div class="alert-item">
        <div class="alert-icon" style="background:${z.color}22">
          <span style="color:${z.color}">⬡</span>
        </div>
        <div class="alert-content">
          <div class="alert-title">${z.name}</div>
          <div class="alert-text">
            <span class="badge badge-${z.type}">${typeLabel[z.type] || z.type}</span>
            &nbsp;Kapasite: ${z.max_capacity}
          </div>
          ${z.description ? `<div class="alert-time">${z.description}</div>` : ''}
        </div>
        ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteZone('${z.id}')">🗑️</button>` : ''}
      </div>
    `).join('');
  } catch (err) { console.error('Zones error:', err); }
}

async function saveZone() {
  if (!currentPolygon || currentPolygon.length < 3) {
    return alert('Önce haritada en az 3 noktalı bir alan çizin');
  }
  const name = document.getElementById('zoneName').value.trim();
  if (!name) return alert('Bölge adı gerekli');

  try {
    await apiRequest('/zones', {
      method: 'POST',
      body: JSON.stringify({
        name,
        type: document.getElementById('zoneType').value,
        polygon: currentPolygon,
        max_capacity: parseInt(document.getElementById('zoneCapacity').value) || 100,
        color: document.getElementById('zoneColor').value,
        description: document.getElementById('zoneDescription').value.trim()
      })
    });
    cancelZone();
    refreshZones();
  } catch (err) { alert('Hata: ' + err.message); }
}

function cancelZone() {
  currentPolygon = null;
  drawnItems.clearLayers();
  document.getElementById('zoneFormCard').style.display = 'none';
  document.getElementById('zoneName').value = '';
  document.getElementById('zoneDescription').value = '';
  document.getElementById('zoneCapacity').value = '100';
}

async function deleteZone(id) {
  if (!confirm('Bu bölgeyi silmek istiyor musunuz?')) return;
  try { await apiRequest('/zones/' + id, { method: 'DELETE' }); refreshZones(); }
  catch (err) { alert('Hata: ' + err.message); }
}
