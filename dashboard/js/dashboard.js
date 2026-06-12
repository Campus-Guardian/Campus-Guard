// CampusGuard - Dashboard Main
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadDashboard();
  checkUnresolvedEmergencies();
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

// ========= Acil Durum Ses Fonksiyonları =========
// Ses fonksiyonları socket.js içinde window.playEmergencyAlarm / window.stopEmergencyAlarm olarak
// tanımlanmıştır. Geriye dönük uyumluluk için burada sadece yönlendirme yapılıyor.
function playAlarmSound() {
  if (typeof window.playEmergencyAlarm === 'function') window.playEmergencyAlarm();
}
function stopAlarmSound() {
  if (typeof window.stopEmergencyAlarm === 'function') window.stopEmergencyAlarm();
}
function stopEmergencyAlarm() {
  if (typeof window.stopEmergencyAlarm === 'function') window.stopEmergencyAlarm();
}

// ========= Acil Durum Banner =========
function showEmergencyBanner(alert) {
  const banner = document.getElementById('emergencyBanner');
  if (!banner) return;
  const textEl = document.getElementById('emergencyBannerText');
  if (textEl && alert) {
    const cat = alert.alert_type === 'emergency_health' ? '🏥 Sağlık' : '🔒 Güvenlik';
    const who = (alert.details && alert.details.student_id) ? ` — Öğrenci: ${alert.details.student_id}` : '';
    textEl.textContent = `🚨 ACİL DURUM [${cat}]${who} — Müdahale bekleniyor!`;
  }
  banner.classList.add('visible');
  playAlarmSound();
}

function resolveEmergencyBanner() {
  const banner = document.getElementById('emergencyBanner');
  if (banner) banner.classList.remove('visible');
  stopAlarmSound();
}

// Sayfa yüklendiğinde çözülmemiş acil durum var mı kontrol et
async function checkUnresolvedEmergencies() {
  try {
    const res = await apiRequest('/alerts?resolved=false&limit=50');
    if (!res || !res.data) return;
    const emergencies = res.data.filter(a =>
      a.alert_type === 'emergency_health' || a.alert_type === 'emergency_security'
    );
    if (emergencies.length > 0) {
      showEmergencyBanner(emergencies[0]);
    }
  } catch (err) {
    console.error('Emergency check error:', err);
  }
}

// ========= Son Alarmlar — Emergency pinned =========
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
      'abnormal_motion': 'Hareket', 'speed_violation': 'Hız', 'inactivity': 'Hareketsizlik',
      'emergency_health': '🏥 Acil Sağlık', 'emergency_security': '🔒 Acil Güvenlik'
    };

    // Emergency alarmları en başa pin'le
    const emergencies = res.data.filter(a =>
      a.alert_type === 'emergency_health' || a.alert_type === 'emergency_security'
    );
    const others = res.data.filter(a =>
      a.alert_type !== 'emergency_health' && a.alert_type !== 'emergency_security'
    );
    const sorted = [...emergencies, ...others];

    container.innerHTML = sorted.map(a => {
      const isEmergency = a.alert_type === 'emergency_health' || a.alert_type === 'emergency_security';
      const pinIcon = isEmergency ? '📌 ' : '';
      const emergencyClass = isEmergency ? ' emergency-pinned' : '';
      return `
      <div class="alert-item ${a.severity === 'critical' ? 'pulse' : ''}${emergencyClass}">
        <div class="alert-icon ${a.severity}">
          ${severityIcons[a.severity] || '🔔'}
        </div>
        <div class="alert-content">
          <div class="alert-title">${pinIcon}${typeNames[a.alert_type] || a.alert_type}</div>
          <div class="alert-text">${a.message}</div>
          <div class="alert-time">${new Date(a.created_at).toLocaleString('tr-TR')}</div>
        </div>
        <span class="badge badge-${a.severity}">${severityLabels[a.severity] || a.severity}</span>
      </div>
    `;
    }).join('');
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
    a.download = `alerts_report_${new Date().toISOString().slice(0, 10)}.csv`;
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
