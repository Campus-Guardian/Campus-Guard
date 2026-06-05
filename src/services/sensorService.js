const supabase = require('../config/supabase');
const analysisService = require('./analysisService');
const alertService = require('./alertService');
const { getIO } = require('../socket/socketHandler');

/**
 * Sensör Verisi İşleme Servisi
 */
class SensorService {

  async processSensorData(sensorData) {
    try {
      // 1. İvme büyüklüğünü hesapla
      if (sensorData.acceleration_x != null && sensorData.acceleration_y != null && sensorData.acceleration_z != null) {
        sensorData.acceleration_magnitude = Math.sqrt(
          sensorData.acceleration_x ** 2 +
          sensorData.acceleration_y ** 2 +
          sensorData.acceleration_z ** 2
        );
      }

      // 2. Veritabanına kaydet
      const { data: saved, error } = await supabase
        .from('sensor_data')
        .insert({
          device_id: sensorData.device_id,
          latitude: sensorData.latitude,
          longitude: sensorData.longitude,
          noise_level: sensorData.noise_level,
          acceleration_x: sensorData.acceleration_x,
          acceleration_y: sensorData.acceleration_y,
          acceleration_z: sensorData.acceleration_z,
          acceleration_magnitude: sensorData.acceleration_magnitude,
          speed: sensorData.speed,
          battery_level: sensorData.battery_level,
          network_type: sensorData.network_type
        })
        .select()
        .single();

      if (error) {
        console.error('Sensör verisi kaydetme hatası:', error);
        throw error;
      }

      // 3. Cihaz son konum güncelle
      await supabase
        .from('devices')
        .update({
          last_seen: new Date().toISOString(),
          last_latitude: sensorData.latitude,
          last_longitude: sensorData.longitude,
          is_active: true
        })
        .eq('id', sensorData.device_id);

      // 4. Bölgeleri getir ve anomali analizi yap
      const { data: zones } = await supabase.from('zones').select('*').eq('is_active', true);
      const anomalies = analysisService.runAllAnalyses(sensorData, zones || []);

      // 5. Tespit edilen anomaliler için alarm oluştur
      if (anomalies.length > 0) {
        await alertService.createMultipleAlerts(anomalies, sensorData);
      }

      // 6. Kalabalık yoğunluğu güncelle
      if (sensorData.latitude && sensorData.longitude && zones) {
        await this.updateCrowdDensity(zones);
      }

      // 7. Real-time konum güncellemesi
      try {
        const io = getIO();
        if (io) {
          io.emit('sensor-update', {
            device_id: sensorData.device_id,
            latitude: sensorData.latitude,
            longitude: sensorData.longitude,
            noise_level: sensorData.noise_level,
            speed: sensorData.speed,
            timestamp: saved.timestamp
          });
        }
      } catch (e) { /* Socket not ready */ }

      return { saved, anomalies };
    } catch (err) {
      console.error('Sensör işleme hatası:', err);
      throw err;
    }
  }

  async updateCrowdDensity(zones) {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      // Aktif cihazları getir
      const { data: activeDevices } = await supabase
        .from('devices')
        .select('last_latitude, last_longitude')
        .eq('is_active', true)
        .gte('last_seen', fiveMinutesAgo);

      if (!activeDevices) return;

      for (const zone of zones) {
        if (!zone.polygon) continue;
        let count = 0;
        for (const device of activeDevices) {
          if (device.last_latitude && device.last_longitude) {
            if (analysisService.isPointInPolygon([device.last_latitude, device.last_longitude], zone.polygon)) {
              count++;
            }
          }
        }

        const ratio = zone.max_capacity > 0 ? count / zone.max_capacity : 0;
        let level = 'low';
        if (ratio >= 0.9) level = 'critical';
        else if (ratio >= 0.7) level = 'high';
        else if (ratio >= 0.4) level = 'medium';

        await supabase.from('crowd_density').insert({
          zone_id: zone.id,
          device_count: count,
          density_level: level,
          capacity_ratio: ratio
        });

        // Kalabalık alarmı kontrolü
        const crowdAlert = analysisService.analyzeCrowdDensity(count, zone);
        if (crowdAlert) {
          await alertService.createAlert({ ...crowdAlert, device_id: null });
        }
      }
    } catch (err) {
      console.error('Yoğunluk güncelleme hatası:', err);
    }
  }
}

module.exports = new SensorService();
