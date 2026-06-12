import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as TaskManager from 'expo-task-manager';
import { enqueueEvent, flushQueue } from './services/eventQueue';
import { evaluateLocalZones } from './services/zoneCache';

export const LOCATION_TASK = 'campusguard-background-location';

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const deviceValue = await AsyncStorage.getItem('cg_m_device');
  if (!deviceValue) return;
  const device = JSON.parse(deviceValue);

  for (const item of data.locations) {
    const location = {
      latitude: item.coords.latitude,
      longitude: item.coords.longitude,
      accuracy: item.coords.accuracy,
    };
    await evaluateLocalZones(location);
    await enqueueEvent({
      event_id: Crypto.randomUUID(),
      device_id: device.id,
      measured_at: new Date(item.timestamp || Date.now()).toISOString(),
      app_state: 'background',
      latitude: location.latitude,
      longitude: location.longitude,
      location_accuracy: location.accuracy,
      speed: item.coords.speed == null ? null : Math.max(0, item.coords.speed * 3.6),
      noise_level: null,
      noise_peak: null,
      acceleration_x: null,
      acceleration_y: null,
      acceleration_z: null,
      acceleration_magnitude: null,
      battery_level: null,
      network_type: null,
      sample_quality: { source: 'background_location' },
    });
  }
  await flushQueue().catch(() => {});
});
