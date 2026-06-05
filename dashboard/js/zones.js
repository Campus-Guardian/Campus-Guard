// CampusGuard - Zones Page with Leaflet.draw
let zonesMap = null;
let drawnItems = null;
let drawControl = null;
let currentPolygon = null;

const CAMPUS = [40.2226, 28.8700];

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  initZonesMap();
  refreshZones();
});

function initZonesMap() {
  zonesMap = L.map('zonesMap').setView(CAMPUS, 16);
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
        polygon: { allowIntersection: false, shapeOptions: { color: '#3b82f6', weight: 2 } },
        polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false
      },
      edit: { featureGroup: drawnItems }
    });
    zonesMap.addControl(drawControl);

    zonesMap.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);
      const latlngs = layer.getLatLngs()[0].map(ll => [ll.lat, ll.lng]);
      currentPolygon = latlngs;
      document.getElementById('zoneFormCard').style.display = 'block';
    });
  }
}

async function refreshZones() {
  try {
    const res = await apiRequest('/zones');
    if (!res || !res.data) return;
    // Clear existing
    zonesMap.eachLayer(l => { if (l instanceof L.Polygon && !drawnItems.hasLayer(l)) zonesMap.removeLayer(l); });

    const list = document.getElementById('zoneList');
    if (res.data.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">🗺️</div><p>Henüz bölge tanımlanmamış</p></div>';
      return;
    }

    res.data.forEach(z => {
      if (z.polygon && z.polygon.length >= 3) {
        const poly = L.polygon(z.polygon, {
          color: z.color || '#3b82f6', fillColor: z.color || '#3b82f6',
          fillOpacity: 0.2, weight: 2
        }).addTo(zonesMap);
        poly.bindPopup(`<b>${z.name}</b><br>Tip: ${z.type}<br>Kapasite: ${z.max_capacity}`);
      }
    });

    const user = getUser();
    const isAdmin = user && user.role === 'admin';
    const typeLabels = { normal: 'Normal', restricted: 'Kısıtlı', danger: 'Tehlikeli' };

    list.innerHTML = res.data.map(z => `
      <div class="alert-item">
        <div class="alert-icon" style="background:${z.color}22">
          <span style="color:${z.color}">⬡</span>
        </div>
        <div class="alert-content">
          <div class="alert-title">${z.name}</div>
          <div class="alert-text">
            <span class="badge badge-${z.type}">${typeLabels[z.type]}</span>
            Kapasite: ${z.max_capacity}
          </div>
          ${z.description ? `<div class="alert-time">${z.description}</div>` : ''}
        </div>
        ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteZone('${z.id}')">🗑️</button>` : ''}
      </div>
    `).join('');
  } catch (err) { console.error('Zones error:', err); }
}

async function saveZone() {
  if (!currentPolygon) return alert('Önce haritada polygon çizin');
  const name = document.getElementById('zoneName').value;
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
        description: document.getElementById('zoneDescription').value
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
}

async function deleteZone(id) {
  if (!confirm('Bu bölgeyi silmek istiyor musunuz?')) return;
  try { await apiRequest('/zones/' + id, { method: 'DELETE' }); refreshZones(); }
  catch (err) { alert('Hata: ' + err.message); }
}
