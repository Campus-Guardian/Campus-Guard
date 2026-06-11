const analysisService = require('./analysisService');
const alertService = require('./alertService');
const supabase = require('../config/supabase');
const { THRESHOLDS } = require('../config/zones');

class NoiseCorrelationService {
  constructor() {
    // In-memory buffer: Map<zone_id, Map<device_id, { highCount, lastTimestamp }>>
    this.noiseBuffers = new Map();
    // Keep track of last correlation alert timestamp per zone to prevent spamming Map<zone_id, timestamp>
    this.lastAlertTimestamps = new Map();
  }

  /**
   * Process incoming sensor data and verify noise correlation in the corresponding zones.
   * @param {Object} sensorData - The processed sensor packet.
   * @param {Array} zones - List of active campus zones.
   */
  async processNoise(sensorData, zones) {
    try {
      const { device_id, latitude, longitude, noise_level } = sensorData;
      if (!device_id || !latitude || !longitude || noise_level == null) return;

      // Find which active zones this device is currently inside
      const activeZonesForDevice = [];
      for (const zone of zones) {
        if (zone.polygon && Array.isArray(zone.polygon)) {
          if (analysisService.isPointInPolygon([latitude, longitude], zone.polygon)) {
            activeZonesForDevice.push(zone);
          }
        }
      }

      // If device is not in any zone, skip
      if (activeZonesForDevice.length === 0) return;

      const now = Date.now();
      const NOISE_THRESHOLD = THRESHOLDS.NOISE_WARNING; // 70 dB

      for (const zone of activeZonesForDevice) {
        // Get or initialize zone buffer
        if (!this.noiseBuffers.has(zone.id)) {
          this.noiseBuffers.set(zone.id, new Map());
        }
        const zoneBuffer = this.noiseBuffers.get(zone.id);

        // Update count for this device
        if (noise_level >= NOISE_THRESHOLD) {
          let devEntry = zoneBuffer.get(device_id);
          if (!devEntry || (now - devEntry.lastTimestamp > 30000)) {
            // Reset if no recent data (stale)
            devEntry = { highCount: 0 };
          }
          devEntry.highCount++;
          devEntry.lastTimestamp = now;
          zoneBuffer.set(device_id, devEntry);
        } else {
          // If noise drops below threshold, reset the consecutive high count
          zoneBuffer.set(device_id, { highCount: 0, lastTimestamp: now });
        }

        // Clean up stale device entries (older than 30s) in this zone buffer
        for (const [devId, entry] of zoneBuffer.entries()) {
          if (now - entry.lastTimestamp > 30000) {
            zoneBuffer.delete(devId);
          }
        }

        // Count how many different devices have >= 5 consecutive high noise packets
        let highCountDevices = 0;
        for (const entry of zoneBuffer.values()) {
          if (entry.highCount >= 5) {
            highCountDevices++;
          }
        }

        // Correlation alert condition: at least 3 devices with >= 5 packets
        if (highCountDevices >= 3) {
          const lastAlertTime = this.lastAlertTimestamps.get(zone.id) || 0;
          
          // Anti-spam rule: trigger at most once every 60 seconds per zone
          if (now - lastAlertTime > 60000) {
            this.lastAlertTimestamps.set(zone.id, now);
            
            // Clear buffer for this zone to avoid duplicate alarms on next ticks
            zoneBuffer.clear();

            console.log(`[Noise Correlation] Zone alert triggered for: ${zone.name}. Active noisy devices count: ${highCountDevices}`);

            // Create and log correlation alert
            await alertService.createAlert({
              device_id: null, // Zone alert, not tied to a single device
              zone_id: zone.id,
              type: 'noise_critical',
              severity: 'critical',
              message: `🚨 "${zone.name}" bölgesinde gürültü alarmı! En az 3 farklı cihazdan ardışık yüksek gürültü paketleri (>= 5 adet) algılandı.`,
              details: {
                zone_name: zone.name,
                noisy_devices_count: highCountDevices,
                threshold: NOISE_THRESHOLD
              },
              latitude: latitude,
              longitude: longitude
            });
          }
        }
      }
    } catch (err) {
      console.error('Noise correlation calculation failed:', err);
    }
  }
}

module.exports = new NoiseCorrelationService();
