// CampusGuard - Alerts Page
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadAlerts();
  loadAlertStats();
});

async function loadAlertStats() {
  try {
    const stats = await apiRequest('/alerts/stats');
    if (!stats) return;
    document.getElementById('alertActive').textContent = stats.active;
    document.getElementById('alertResolved').textContent = stats.resolved;
    document.getElementById('alertTotal').textContent = stats.total;
  } catch (err) { console.error(err); }
}

async function loadAlerts() {
  try {
    const type = document.getElementById('filterType').value;
    const severity = document.getElementById('filterSeverity').value;
    const resolved = document.getElementById('filterResolved').value;

    let url = '/alerts?limit=100';
    if (type) url += '&type=' + type;
    if (severity) url += '&severity=' + severity;
    if (resolved !== '') url += '&resolved=' + resolved;

    const res = await apiRequest(url);
    const tbody = document.getElementById('alertTableBody');

    if (!res || !res.data || res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Alarm bulunamadı</td></tr>';
      return;
    }

    const severityLabels = { critical: 'Kritik', high: 'Yüksek', medium: 'Orta', low: 'Düşük' };
    const typeNames = {
      'noise_warning': '🔊 Gürültü (Uyarı)', 'noise_critical': '🔊 Gürültü (Kritik)',
      'crowd_warning': '👥 Kalabalık (Uyarı)', 'crowd_critical': '👥 Kalabalık (Kritik)',
      'restricted_zone': '🚧 Kısıtlı Bölge', 'danger_zone': '☠️ Tehlikeli Bölge',
      'abnormal_motion': '💥 Anormal Hareket', 'speed_violation': '🏎️ Hız İhlali',
      'inactivity': '😴 Hareketsizlik',
      'emergency_health': '📌 🏥 Acil Sağlık', 'emergency_security': '📌 🔒 Acil Güvenlik'
    };

    const user = getUser();
    const isAdmin = user && user.role === 'admin';

    // Emergency alarmları tablonun başına pin'le
    const emergencies = res.data.filter(a =>
      a.alert_type === 'emergency_health' || a.alert_type === 'emergency_security'
    );
    const others = res.data.filter(a =>
      a.alert_type !== 'emergency_health' && a.alert_type !== 'emergency_security'
    );
    const sorted = [...emergencies, ...others];

    tbody.innerHTML = sorted.map(a => {
      const details = a.details || {};
      const isEmergency = a.alert_type === 'emergency_health' || a.alert_type === 'emergency_security';
      const emergencyStyle = isEmergency
        ? ' style="background:rgba(239,68,68,0.07);border-left:3px solid #ef4444;"'
        : '';
      return `
      <tr class="${isEmergency ? 'emergency-pinned' : ''}"${emergencyStyle}>
        <td><span class="badge badge-${a.severity}">${severityLabels[a.severity] || a.severity}</span></td>
        <td>${typeNames[a.alert_type] || a.alert_type}</td>
        <td>${details.student_id || '-'}</td>
        <td style="max-width:300px">${a.message}</td>
        <td style="white-space:nowrap">${new Date(a.created_at).toLocaleString('tr-TR')}</td>
        <td><span class="badge ${a.is_resolved ? 'badge-resolved' : 'badge-active'}">${a.is_resolved ? 'Çözüldü' : 'Çözülmemiş'}</span></td>
        <td>${!a.is_resolved && isAdmin ? `<button class="btn btn-success btn-sm" onclick="resolveAlert('${a.id}')">✓ Çöz</button>` : ''}</td>
      </tr>
    `;
    }).join('');

  } catch (err) {
    console.error('Load alerts error:', err);
  }
}

async function resolveAlert(id) {
  try {
    await apiRequest('/alerts/' + id + '/resolve', { method: 'PATCH' });
    loadAlerts();
    loadAlertStats();
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

async function resolveAllAlerts() {
  if (!confirm('Tüm çözülmemiş alarmları çözülmüş olarak işaretlemek istediğinizden emin misiniz?')) return;
  try {
    await apiRequest('/alerts/resolve-all', { method: 'PATCH' });
    loadAlerts();
    loadAlertStats();
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

async function deleteResolvedAlerts() {
  if (!confirm('Çözülmüş tüm alarmları kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) return;
  try {
    const res = await apiRequest('/alerts/resolved', { method: 'DELETE' });
    alert(`✅ ${res.count || 0} adet çözülmüş alarm silindi.`);
    loadAlerts();
    loadAlertStats();
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}
