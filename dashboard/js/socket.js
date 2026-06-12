window.socket = null;

function initSocket() {
  if (window.socket || typeof io === 'undefined') return;

  window.socket = io(window.location.origin, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  window.socket.on('connect', () => {
    window.socket.emit('join-dashboard');
  });

  window.socket.on('connect_error', (error) => {
    if (error.message === 'unauthorized') {
      clearAuth();
      window.location.href = '/dashboard/';
    }
  });

  window.socket.on('new-alert', (alert) => {
    const count = document.getElementById('alertCount');
    if (count) count.textContent = Number(count.textContent || 0) + 1;
    if (typeof handleMapAlert === 'function') handleMapAlert(alert);
    if (typeof loadStats === 'function') loadStats();
    if (typeof loadRecentAlerts === 'function') loadRecentAlerts();
    if (typeof loadAlerts === 'function') loadAlerts();
    if (typeof loadAlertStats === 'function') loadAlertStats();
  });

  window.socket.on('alert-resolved', (alert) => {
    if (typeof handleMapAlertResolved === 'function') handleMapAlertResolved(alert);
    if (typeof loadStats === 'function') loadStats();
    if (typeof loadRecentAlerts === 'function') loadRecentAlerts();
    if (typeof loadAlerts === 'function') loadAlerts();
    if (typeof loadAlertStats === 'function') loadAlertStats();
  });

  window.socket.on('alert-updated', () => {
    if (typeof loadStats === 'function') loadStats();
    if (typeof loadRecentAlerts === 'function') loadRecentAlerts();
    if (typeof loadAlerts === 'function') loadAlerts();
    if (typeof loadAlertStats === 'function') loadAlertStats();
  });

  window.socket.on('all-alerts-resolved', () => {
    if (typeof clearMapAlertHighlights === 'function') clearMapAlertHighlights();
    const count = document.getElementById('alertCount');
    if (count) count.textContent = '0';
    if (typeof loadStats === 'function') loadStats();
    if (typeof loadRecentAlerts === 'function') loadRecentAlerts();
    if (typeof loadAlerts === 'function') loadAlerts();
    if (typeof loadAlertStats === 'function') loadAlertStats();
  });

  window.socket.on('sensor-update', (data) => {
    if (typeof updateDeviceOnMap === 'function') updateDeviceOnMap(data);
  });
}

initSocket();
