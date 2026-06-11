// CampusGuard - Socket.io Client
let socket = null;

function initSocket() {
  if (socket) return;
  socket = io(window.location.origin);

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
    socket.emit('join-dashboard');
  });

  socket.on('new-alert', (alert) => {
    console.log('[Socket] New alert:', alert);
    // Update alert count
    const countEl = document.getElementById('alertCount');
    if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    // Refresh data if on dashboard
    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof loadAlerts === 'function') loadAlerts();
  });

  socket.on('all-alerts-resolved', () => {
    console.log('[Socket] All alerts resolved');
    const countEl = document.getElementById('alertCount');
    if (countEl) countEl.textContent = '0';
    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof loadAlerts === 'function') loadAlerts();
  });

  socket.on('sensor-update', (data) => {
    console.log('[Socket] Sensor update:', data);
    if (typeof updateDeviceOnMap === 'function') updateDeviceOnMap(data);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
  });
}

// Init on page load
if (typeof io !== 'undefined') {
  initSocket();
}
