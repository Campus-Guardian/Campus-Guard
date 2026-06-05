const { THRESHOLDS } = require('../config/zones');

/**
 * Anomali Tespit Motoru
 * Sensör verilerini analiz ederek olağandışı durumları tespit eder
 */
class AnalysisService {
  
  // Gürültü seviyesi analizi
  analyzeNoise(noiseLevel) {
    if (noiseLevel == null) return null;
    if (noiseLevel >= THRESHOLDS.NOISE_CRITICAL) {
      return { type: 'noise_critical', severity: 'critical', message: `Kritik gürültü seviyesi: ${noiseLevel.toFixed(1)} dB` };
    }
    if (noiseLevel >= THRESHOLDS.NOISE_WARNING) {
      return { type: 'noise_warning', severity: 'high', message: `Yüksek gürültü seviyesi: ${noiseLevel.toFixed(1)} dB` };
    }
    return null;
  }

  // Hareket analizi (ivmeölçer)
  analyzeMotion(ax, ay, az) {
    if (ax == null || ay == null || az == null) return null;
    const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
    if (magnitude >= THRESHOLDS.ACCELERATION_SPIKE) {
      return {
        type: 'abnormal_motion',
        severity: magnitude >= 30 ? 'critical' : 'high',
        message: `Anormal hareket algılandı: ${magnitude.toFixed(1)} m/s²`,
        details: { magnitude, ax, ay, az }
      };
    }
    return null;
  }

  // Hız ihlali kontrolü
  analyzeSpeed(speed) {
    if (speed == null) return null;
    if (speed > THRESHOLDS.SPEED_LIMIT) {
      return {
        type: 'speed_violation',
        severity: speed > 50 ? 'critical' : 'medium',
        message: `Hız ihlali: ${speed.toFixed(1)} km/h (Limit: ${THRESHOLDS.SPEED_LIMIT} km/h)`
      };
    }
    return null;
  }

  // Riskli bölge kontrolü (Point-in-Polygon ray casting)
  analyzeZoneProximity(lat, lng, zones) {
    if (lat == null || lng == null || !zones) return [];
    const alerts = [];
    
    for (const zone of zones) {
      if (!zone.polygon || !Array.isArray(zone.polygon)) continue;
      if (zone.type === 'normal') continue;
      
      if (this.isPointInPolygon([lat, lng], zone.polygon)) {
        const severity = zone.type === 'danger' ? 'critical' : 'high';
        const alertType = zone.type === 'danger' ? 'danger_zone' : 'restricted_zone';
        alerts.push({
          type: alertType,
          severity,
          zone_id: zone.id,
          message: `${zone.type === 'danger' ? 'Tehlikeli' : 'Kısıtlı'} bölgeye giriş: ${zone.name}`
        });
      }
    }
    return alerts;
  }

  // Kalabalık yoğunluğu analizi
  analyzeCrowdDensity(deviceCount, zone) {
    if (!zone || !zone.max_capacity || zone.max_capacity === 0) return null;
    const ratio = deviceCount / zone.max_capacity;
    
    if (ratio >= THRESHOLDS.CROWD_CRITICAL) {
      return {
        type: 'crowd_critical',
        severity: 'critical',
        zone_id: zone.id,
        message: `Kritik kalabalık: ${zone.name} (${deviceCount}/${zone.max_capacity} - %${(ratio * 100).toFixed(0)})`,
        details: { deviceCount, maxCapacity: zone.max_capacity, ratio }
      };
    }
    if (ratio >= THRESHOLDS.CROWD_WARNING) {
      return {
        type: 'crowd_warning',
        severity: 'high',
        zone_id: zone.id,
        message: `Yoğun kalabalık: ${zone.name} (${deviceCount}/${zone.max_capacity} - %${(ratio * 100).toFixed(0)})`,
        details: { deviceCount, maxCapacity: zone.max_capacity, ratio }
      };
    }
    return null;
  }

  // Tüm analizleri çalıştır
  runAllAnalyses(sensorData, zones) {
    const alerts = [];
    
    const noise = this.analyzeNoise(sensorData.noise_level);
    if (noise) alerts.push(noise);
    
    const motion = this.analyzeMotion(sensorData.acceleration_x, sensorData.acceleration_y, sensorData.acceleration_z);
    if (motion) alerts.push(motion);
    
    const speed = this.analyzeSpeed(sensorData.speed);
    if (speed) alerts.push(speed);
    
    const zoneAlerts = this.analyzeZoneProximity(sensorData.latitude, sensorData.longitude, zones);
    alerts.push(...zoneAlerts);
    
    return alerts;
  }

  // Ray-casting point-in-polygon algoritması
  isPointInPolygon(point, polygon) {
    const [px, py] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}

module.exports = new AnalysisService();
