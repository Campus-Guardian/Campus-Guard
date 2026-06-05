// CampusGuard - Devices Page
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadDevices();
});

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
        <td><strong>${d.device_name}</strong></td>
        <td>${d.device_type || 'smartphone'}</td>
        <td>${d.platform || '-'}</td>
        <td><span class="badge ${isOnline ? 'badge-online' : 'badge-offline'}">${isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</span></td>
        <td>${d.last_seen ? new Date(d.last_seen).toLocaleString('tr-TR') : '-'}</td>
        <td>${d.last_latitude ? d.last_latitude.toFixed(4)+', '+d.last_longitude.toFixed(4) : '-'}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteDevice('${d.id}')">🗑️</button></td>
      </tr>`;
    }).join('');
  } catch (err) { console.error(err); }
}

function showRegisterDevice() { document.getElementById('deviceModal').classList.add('show'); }
function closeModal() { document.getElementById('deviceModal').classList.remove('show'); }

async function registerDevice() {
  try {
    await apiRequest('/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        device_name: document.getElementById('deviceName').value,
        device_type: document.getElementById('deviceType').value,
        platform: document.getElementById('devicePlatform').value
      })
    });
    closeModal(); loadDevices();
  } catch (err) { alert('Hata: ' + err.message); }
}

async function deleteDevice(id) {
  if (!confirm('Bu cihazı silmek istediğinizden emin misiniz?')) return;
  try { await apiRequest('/devices/' + id, { method: 'DELETE' }); loadDevices(); }
  catch (err) { alert('Hata: ' + err.message); }
}
