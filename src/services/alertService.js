const supabase = require('../config/supabase');
const { getIO } = require('../socket/socketHandler');

/**
 * Alarm Servisi - Alarm oluşturma ve yönetim
 */
class AlertService {

  async createAlert(alertData) {
    try {
      // Duplikasyon ve spam engelleme:
      // Eğer bu cihaz/bölge için zaten aynı tipte çözülmemiş (is_resolved = false) bir alarm varsa yeni alarm oluşturma.
      let checkQuery = supabase
        .from('alerts')
        .select('id')
        .eq('alert_type', alertData.type)
        .eq('is_resolved', false);

      if (alertData.device_id) {
        checkQuery = checkQuery.eq('device_id', alertData.device_id);
      } else if (alertData.zone_id) {
        checkQuery = checkQuery.eq('zone_id', alertData.zone_id);
      }

      const { data: existingAlerts } = await checkQuery;
      if (existingAlerts && existingAlerts.length > 0) {
        return null;
      }

      const { data, error } = await supabase
        .from('alerts')
        .insert({
          device_id: alertData.device_id || null,
          zone_id: alertData.zone_id || null,
          alert_type: alertData.type,
          severity: alertData.severity,
          message: alertData.message,
          details: alertData.details || null,
          latitude: alertData.latitude || null,
          longitude: alertData.longitude || null
        })
        .select('*')
        .single();

      if (error) {
        console.error('Alert oluşturma hatası:', error);
        return null;
      }

      // Socket.io ile real-time bildirim
      try {
        const io = getIO();
        if (io) {
          io.emit('new-alert', data);
          io.emit('alert-count-update');
        }
      } catch (e) {
        // Socket henüz hazır değilse sessizce devam et
      }

      return data;
    } catch (err) {
      console.error('Alert servisi hatası:', err);
      return null;
    }
  }

  async createMultipleAlerts(alerts, sensorData) {
    const results = [];
    for (const alert of alerts) {
      const result = await this.createAlert({
        ...alert,
        device_id: sensorData.device_id,
        latitude: sensorData.latitude,
        longitude: sensorData.longitude
      });
      if (result) results.push(result);
    }
    return results;
  }
}

module.exports = new AlertService();
