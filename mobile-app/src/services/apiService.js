import * as Crypto from 'expo-crypto';
import { enqueueEvent, flushQueue, getQueueSize } from './eventQueue';
import { getSensorSnapshot } from './sensorService';

const SEND_INTERVAL = 5000;
let sendTimer = null;
let dataCount = 0;
let onDataCountUpdate = null;
let flushing = false;

export function setOnDataCountUpdate(callback) {
  onDataCountUpdate = callback;
}

export function getDataCount() {
  return dataCount;
}

async function queueSnapshot(deviceId) {
  const snapshot = getSensorSnapshot();
  await enqueueEvent({
    event_id: Crypto.randomUUID(),
    device_id: deviceId,
    measured_at: new Date().toISOString(),
    app_state: snapshot.app_state,
    latitude: snapshot.latitude,
    longitude: snapshot.longitude,
    location_accuracy: snapshot.location_accuracy,
    speed: snapshot.speed,
    noise_level: snapshot.noise_level,
    noise_peak: snapshot.noise_peak,
    acceleration_x: snapshot.acceleration_x,
    acceleration_y: snapshot.acceleration_y,
    acceleration_z: snapshot.acceleration_z,
    acceleration_magnitude: snapshot.acceleration_magnitude,
    battery_level: snapshot.battery_level,
    network_type: snapshot.network_type,
    sample_quality: snapshot.sample_quality,
  });
  dataCount += 1;
  onDataCountUpdate?.(dataCount);
}

async function tryFlush() {
  if (flushing) return;
  flushing = true;
  try {
    while ((await getQueueSize()) > 0) {
      const result = await flushQueue();
      if (!result.sent) break;
    }
  } catch {
    // The queue retains the event and applies an exponential retry delay.
  } finally {
    flushing = false;
  }
}

export async function startSending(deviceId) {
  if (sendTimer) return;
  dataCount = 0;
  await queueSnapshot(deviceId);
  tryFlush();
  sendTimer = setInterval(async () => {
    await queueSnapshot(deviceId);
    tryFlush();
  }, SEND_INTERVAL);
}

export function stopSending() {
  clearInterval(sendTimer);
  sendTimer = null;
}

export async function loadOfflineQueue() {
  onDataCountUpdate?.(await getQueueSize());
  await tryFlush();
}
