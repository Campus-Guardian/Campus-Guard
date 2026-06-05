// CampusGuard - Chart.js Charts
let noiseChartInstance = null;
let alertChartInstance = null;

async function initCharts() {
  await initNoiseChart();
  await initAlertChart();
}

async function initNoiseChart() {
  const ctx = document.getElementById('noiseChart');
  if (!ctx) return;

  try {
    const res = await apiRequest('/dashboard/timeseries?hours=1');
    const data = res && res.data ? res.data : [];

    const labels = data.map(d => new Date(d.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    const noiseData = data.map(d => d.noise_level || 0);

    if (noiseChartInstance) noiseChartInstance.destroy();
    noiseChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Gürültü Seviyesi (dB)',
          data: noiseData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }, {
          label: 'Uyarı Eşiği (70 dB)',
          data: noiseData.map(() => 70),
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }, {
          label: 'Kritik Eşik (85 dB)',
          data: noiseData.map(() => 85),
          borderColor: '#ef4444',
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
        },
        scales: {
          x: { ticks: { color: '#64748b', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' }, min: 0, max: 120 }
        }
      }
    });
  } catch (err) {
    console.error('Noise chart error:', err);
  }
}

async function initAlertChart() {
  const ctx = document.getElementById('alertChart');
  if (!ctx) return;

  try {
    const res = await apiRequest('/alerts/stats');
    if (!res) return;

    const types = res.byType || {};
    const labels = Object.keys(types).map(t => {
      const names = {
        'noise_warning': 'Gürültü (Uyarı)', 'noise_critical': 'Gürültü (Kritik)',
        'crowd_warning': 'Kalabalık (Uyarı)', 'crowd_critical': 'Kalabalık (Kritik)',
        'restricted_zone': 'Kısıtlı Bölge', 'danger_zone': 'Tehlikeli Bölge',
        'abnormal_motion': 'Anormal Hareket', 'speed_violation': 'Hız İhlali'
      };
      return names[t] || t;
    });
    const values = Object.values(types);
    const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#dc2626', '#8b5cf6', '#f87171', '#10b981', '#06b6d4'];

    if (alertChartInstance) alertChartInstance.destroy();
    alertChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, values.length),
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#94a3b8', padding: 12, font: { size: 11 } } }
        },
        cutout: '65%'
      }
    });
  } catch (err) {
    console.error('Alert chart error:', err);
  }
}
