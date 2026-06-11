// CampusGuard - Zones Page — BTÜ Mimar Sinan Yerleşkesi
let zonesMap = null;
let drawnItems = null;
let drawControl = null;
let currentPolygon = null;

const CAMPUS = [40.1889, 29.1310];
const CAMPUS_ZOOM = 17;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const campusBounds = L.latLngBounds(
    [40.186121, 29.125768],
    [40.191767, 29.136281]
  );

  zonesMap = L.map('zonesMap', {
    minZoom: 15,
    maxZoom: 19,
    maxBounds: campusBounds,
    maxBoundsViscosity: 1.0
  }).setView(CAMPUS, CAMPUS_ZOOM);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &copy; CARTO',
    maxZoom: 19
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
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
      },
      edit: { featureGroup: drawnItems }
    });
    zonesMap.addControl(drawControl);

    zonesMap.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers();
      const layer = e.layer;
      drawnItems.addLayer(layer);
      currentPolygon = layer.getLatLngs()[0].map(ll => [ll.lat, ll.lng]);
      document.getElementById('zoneFormCard').style.display = 'block';
      document.getElementById('zoneName').focus();
      updateZoneColor();
    });

    zonesMap.on(L.Draw.Event.EDITED, (e) => {
      e.layers.eachLayer(layer => {
        if (layer instanceof L.Polygon) {
          currentPolygon = layer.getLatLngs()[0].map(ll => [ll.lat, ll.lng]);
        }
      });
    });
  }

  refreshZones();
});

function updateZoneColor() {
  const type = document.getElementById('zoneType').value;
  const colors = { normal: '#3b82f6', restricted: '#f59e0b', danger: '#ef4444' };
  document.getElementById('zoneColor').value = colors[type] || '#3b82f6';
}

async function refreshZones() {
  try {
    const res = await apiRequest('/zones');
    if (!res || !res.data) return;

    // Haritadan mevcut polygon layer'ları temizle
    zonesMap.eachLayer(l => {
      if (l instanceof L.Polygon && !drawnItems.hasLayer(l)) {
        zonesMap.removeLayer(l);
      }
    });

    const listEl = document.getElementById('zoneList');

    if (res.data.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">🗺️</div><p>Henüz bölge tanımlanmamış.<br>Harita üzerinde polygon çizerek bölge ekleyin.</p></div>';
      return;
    }

    const typeLabel = { normal: 'Normal', restricted: 'Kısıtlı', danger: 'Tehlikeli' };

    // Haritaya polygon'ları ekle
    res.data.forEach(z => {
      if (z.polygon && z.polygon.length >= 3) {
        const poly = L.polygon(z.polygon, {
          color: z.color || '#3b82f6',
          fillColor: z.color || '#3b82f6',
          fillOpacity: 0.2,
          weight: 2
        }).addTo(zonesMap);
        poly.bindPopup(
          '<b>' + z.name + '</b><br>' +
          'Tip: ' + (typeLabel[z.type] || z.type) + '<br>' +
          'Kapasite: ' + z.max_capacity +
          (z.description ? '<br>Not: ' + z.description : '')
        );
      }
    });

    const user = getUser();
    const isAdmin = user && user.role === 'admin';

    // Liste HTML'ini oluştur
    listEl.innerHTML = res.data.map(z => {
      const safeColor = z.color || '#3b82f6';
      const safeName = (z.name || '').replace(/"/g, '&quot;');
      const safeDesc = (z.description || '').replace(/"/g, '&quot;');

      const adminBtns = isAdmin
        ? '<div style="display:flex;gap:6px;flex-shrink:0">' +
            '<button class="btn btn-outline btn-sm" title="Düzenle"' +
              ' data-action="edit"' +
              ' data-id="' + z.id + '"' +
              ' data-name="' + safeName + '"' +
              ' data-type="' + z.type + '"' +
              ' data-capacity="' + z.max_capacity + '"' +
              ' data-color="' + safeColor + '"' +
              ' data-desc="' + safeDesc + '">✏️</button>' +
            '<button class="btn btn-danger btn-sm" title="Sil"' +
              ' data-action="delete"' +
              ' data-id="' + z.id + '">🗑️</button>' +
          '</div>'
        : '';

      return '<div class="alert-item">' +
        '<div class="alert-icon" style="background:' + safeColor + '22">' +
          '<span style="color:' + safeColor + '">⬡</span>' +
        '</div>' +
        '<div class="alert-content">' +
          '<div class="alert-title">' + z.name + '</div>' +
          '<div class="alert-text">' +
            '<span class="badge badge-' + z.type + '">' + (typeLabel[z.type] || z.type) + '</span>' +
            ' Kapasite: ' + z.max_capacity +
          '</div>' +
          (z.description ? '<div class="alert-time">' + z.description + '</div>' : '') +
        '</div>' +
        adminBtns +
      '</div>';
    }).join('');

    // Event delegation — her refresh'te listener birikiyor olmasın
    const newList = listEl.cloneNode(true);
    listEl.parentNode.replaceChild(newList, listEl);

    newList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'delete') {
        deleteZone(id);
      } else if (action === 'edit') {
        editZone(
          id,
          btn.dataset.name,
          btn.dataset.type,
          parseInt(btn.dataset.capacity),
          btn.dataset.color,
          btn.dataset.desc
        );
      }
    });

  } catch (err) {
    console.error('Zones error:', err);
  }
}

// ===== Yeni Bölge Kaydetme =====

async function saveZone() {
  if (!currentPolygon || currentPolygon.length < 3) {
    return alert('Önce haritada en az 3 noktalı bir alan çizin');
  }
  const name = document.getElementById('zoneName').value.trim();
  if (!name) return alert('Bölge adı gerekli');

  const capacityRaw = parseInt(document.getElementById('zoneCapacity').value);
  const max_capacity = isNaN(capacityRaw) ? 100 : capacityRaw;

  try {
    await apiRequest('/zones', {
      method: 'POST',
      body: JSON.stringify({
        name,
        type: document.getElementById('zoneType').value,
        polygon: currentPolygon,
        max_capacity,
        color: document.getElementById('zoneColor').value,
        description: document.getElementById('zoneDescription').value.trim()
      })
    });
    cancelZone();
    refreshZones();
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

function cancelZone() {
  currentPolygon = null;
  if (drawnItems) drawnItems.clearLayers();
  document.getElementById('zoneFormCard').style.display = 'none';
  document.getElementById('zoneName').value = '';
  document.getElementById('zoneDescription').value = '';
  document.getElementById('zoneCapacity').value = '100';
}

// ===== Bölge Düzenleme =====

function editZone(id, name, type, max_capacity, color, description) {
  document.getElementById('editZoneId').value = id;
  document.getElementById('editZoneName').value = name;
  document.getElementById('editZoneType').value = type;
  document.getElementById('editZoneCapacity').value = isNaN(max_capacity) ? 100 : max_capacity;
  document.getElementById('editZoneColor').value = color || '#3b82f6';
  document.getElementById('editZoneDescription').value = description || '';
  document.getElementById('editZoneModal').classList.add('show');
}

function closeEditZoneModal() {
  document.getElementById('editZoneModal').classList.remove('show');
}

async function updateZone() {
  const id = document.getElementById('editZoneId').value;
  const name = document.getElementById('editZoneName').value.trim();
  if (!name) return alert('Bölge adı gerekli');

  const capacityRaw = parseInt(document.getElementById('editZoneCapacity').value);
  const max_capacity = isNaN(capacityRaw) ? 100 : capacityRaw;

  try {
    await apiRequest('/zones/' + id, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        type: document.getElementById('editZoneType').value,
        max_capacity,
        color: document.getElementById('editZoneColor').value,
        description: document.getElementById('editZoneDescription').value.trim()
      })
    });
    closeEditZoneModal();
    refreshZones();
  } catch (err) {
    alert('Güncelleme hatası: ' + err.message);
  }
}

// ===== Bölge Silme =====

async function deleteZone(id) {
  if (!confirm('Bu bölgeyi silmek istiyor musunuz?')) return;
  try {
    await apiRequest('/zones/' + id, { method: 'DELETE' });
    refreshZones();
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}
