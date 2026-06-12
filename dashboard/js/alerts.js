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
  } catch (error) {
    console.error(error);
  }
}

async function loadAlerts() {
  try {
    const type = document.getElementById('filterType').value;
    const severity = document.getElementById('filterSeverity').value;
    const resolved = document.getElementById('filterResolved').value;
    const params = new URLSearchParams({ limit: '100' });
    if (type) params.set('type', type);
    if (severity) params.set('severity', severity);
    if (resolved !== '') params.set('resolved', resolved);

    const result = await apiRequest(`/alerts?${params}`);
    const tbody = document.getElementById('alertTableBody');
    if (!result?.data?.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Alarm bulunamadi</td></tr>';
      return;
    }

    const severityLabels = {
      critical: 'Kritik',
      high: 'Yuksek',
      medium: 'Orta',
      low: 'Dusuk',
    };
    const typeNames = {
      noise_zone: 'Bolgesel gurultu',
      noise_critical: 'Bolgesel gurultu',
      crowd_warning: 'Kalabalik',
      crowd_critical: 'Kritik kalabalik',
      restricted_zone: 'Kisitli bolge',
      danger_zone: 'Tehlikeli bolge',
      abnormal_motion: 'Anormal hareket',
      speed_violation: 'Hiz ihlali',
    };

    tbody.innerHTML = result.data.map((item) => {
      const details = item.details || {};
      const repeats = item.occurrence_count > 1 ? ` (${item.occurrence_count} tekrar)` : '';
      return `
        <tr>
          <td><span class="badge badge-${escapeHtml(item.severity)}">${escapeHtml(severityLabels[item.severity] || item.severity)}</span></td>
          <td>${escapeHtml(typeNames[item.alert_type] || item.alert_type)}</td>
          <td>${escapeHtml(details.student_id || '-')}</td>
          <td style="max-width:300px">${escapeHtml(item.message + repeats)}</td>
          <td style="white-space:nowrap">${new Date(item.last_seen || item.created_at).toLocaleString('tr-TR')}</td>
          <td><span class="badge ${item.is_resolved ? 'badge-resolved' : 'badge-active'}">${item.is_resolved ? 'Cozuldu' : 'Aktif'}</span></td>
          <td>${item.is_resolved ? '' : `<button class="btn btn-success btn-sm" data-resolve-id="${escapeHtml(item.id)}">Coz</button>`}</td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-resolve-id]').forEach((button) => {
      button.addEventListener('click', () => resolveAlert(button.dataset.resolveId));
    });
  } catch (error) {
    console.error('Load alerts error:', error);
  }
}

async function resolveAlert(id) {
  try {
    await apiRequest(`/alerts/${encodeURIComponent(id)}/resolve`, { method: 'PATCH' });
    await Promise.all([loadAlerts(), loadAlertStats()]);
  } catch (error) {
    alert('Hata: ' + error.message);
  }
}

async function resolveAllAlerts() {
  if (!confirm('Tum aktif alarmlar cozulmus olarak isaretlensin mi?')) return;
  try {
    await apiRequest('/alerts/resolve-all', { method: 'PATCH' });
    await Promise.all([loadAlerts(), loadAlertStats()]);
  } catch (error) {
    alert('Hata: ' + error.message);
  }
}
