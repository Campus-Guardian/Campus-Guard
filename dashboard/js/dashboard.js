document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadDashboard();
});

async function loadDashboard() {
  await loadStats();
  initDashboardMap();
  await loadRecentAlerts();
  initCharts();
}

async function loadStats() {
  try {
    const stats = await apiRequest('/dashboard/stats');
    if (!stats) return;
    document.getElementById('statDevices').textContent = stats.totalDevices;
    document.getElementById('statOnline').textContent = stats.onlineDevices;
    document.getElementById('statAlerts').textContent = stats.activeAlerts;
    document.getElementById('statCritical').textContent = stats.criticalAlerts;
    document.getElementById('statZones').textContent = stats.totalZones;
    document.getElementById('statTotalAlerts').textContent = stats.totalAlerts;
    document.getElementById('alertCount').textContent = stats.activeAlerts;
  } catch (error) {
    console.error('Stats error:', error);
  }
}

async function loadRecentAlerts() {
  try {
    const result = await apiRequest('/alerts?limit=10&resolved=false');
    const container = document.getElementById('recentAlerts');
    if (!result?.data?.length) {
      container.innerHTML = '<div class="empty-state"><p>Aktif alarm yok</p></div>';
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

    container.innerHTML = result.data.map((alert) => `
      <div class="alert-item ${alert.severity === 'critical' ? 'pulse' : ''}">
        <div class="alert-icon ${escapeHtml(alert.severity)}">!</div>
        <div class="alert-content">
          <div class="alert-title">${escapeHtml(typeNames[alert.alert_type] || alert.alert_type)}</div>
          <div class="alert-text">${escapeHtml(alert.message)}</div>
          <div class="alert-time">${new Date(alert.last_seen || alert.created_at).toLocaleString('tr-TR')}</div>
        </div>
        <span class="badge badge-${escapeHtml(alert.severity)}">${escapeHtml(severityLabels[alert.severity] || alert.severity)}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Recent alerts error:', error);
  }
}

async function downloadAlertsReport() {
  try {
    const response = await fetch(`${window.location.origin}/api/reports/alerts/csv`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'CSV raporu indirilemedi');
    }

    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `alerts_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert('Hata: ' + error.message);
  }
}

setInterval(() => {
  loadStats();
  loadRecentAlerts();
}, 30000);
