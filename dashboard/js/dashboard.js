// CampusGuard - Dashboard Main
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

    // Pulse effect for critical alerts
    if (stats.criticalAlerts > 0) {
      document.getElementById('statCritical').classList.add('pulse');
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}

async function loadRecentAlerts() {
  try {
    const res = await apiRequest('/alerts?limit=10&resolved=false');
    const container = document.getElementById('recentAlerts');
    if (!res || !res.data || res.data.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><p>Aktif alarm yok</p></div>';
      return;
    }

    const severityIcons = { critical: '🚨', high: '⚠️', medium: '🔶', low: 'ℹ️' };
    const severityLabels = { critical: 'Kritik', high: 'Yüksek', medium: 'Orta', low: 'Düşük' };
    const typeNames = {
      'noise_warning': 'Gürültü', 'noise_critical': 'Gürültü', 'crowd_warning': 'Kalabalık',
      'crowd_critical': 'Kalabalık', 'restricted_zone': 'Kısıtlı Bölge', 'danger_zone': 'Tehlikeli Bölge',
      'abnormal_motion': 'Hareket', 'speed_violation': 'Hız', 'inactivity': 'Hareketsizlik'
    };

    container.innerHTML = res.data.map(a => `
      <div class="alert-item ${a.severity === 'critical' ? 'pulse' : ''}">
        <div class="alert-icon ${a.severity}">
          ${severityIcons[a.severity] || '🔔'}
        </div>
        <div class="alert-content">
          <div class="alert-title">${typeNames[a.alert_type] || a.alert_type}</div>
          <div class="alert-text">${a.message}</div>
          <div class="alert-time">${new Date(a.created_at).toLocaleString('tr-TR')}</div>
        </div>
        <span class="badge badge-${a.severity}">${severityLabels[a.severity] || a.severity}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Recent alerts error:', err);
  }
}

async function downloadAlertsReport() {
  try {
    const token = localStorage.getItem('cg_token');
    if (!token) return alert('Oturum sonlanmış, lütfen tekrar giriş yapın');

    const response = await fetch(`${window.location.origin}/api/reports/alerts/csv`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'CSV raporu indirilemedi');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts_report_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

// Auto-refresh every 30 seconds
setInterval(() => {
  loadStats();
  loadRecentAlerts();
}, 30000);
