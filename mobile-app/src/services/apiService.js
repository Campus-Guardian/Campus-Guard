// CampusGuard Mobile - API Communication Service
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mApi } from '../config/api';
import { getSensorSnapshot } from './sensorService';

const SEND_INTERVAL = 5000; // 5 saniye
let sendTimer = null;
let dataCount = 0;
let offlineQueue = [];

let onDataCountUpdate = null;

export function setOnDataCountUpdate(cb) {
  onDataCountUpdate = cb;
}

export function getDataCount() {
  return dataCount;
}

export async function startSending(deviceId) {
  if (sendTimer) return;
  dataCount = 0;

  sendTimer = setInterval(async () => {
    const snapshot = getSensorSnapshot();
    snapshot.device_id = deviceId;

    try {
      const res = await mApi('/sensors/data', {
        method: 'POST',
        body: JSON.stringify(snapshot),
      });
      if (res) {
        dataCount++;
        if (onDataCountUpdate) onDataCountUpdate(dataCount);
        // Send any queued offline data
        if (offlineQueue.length > 0) {
          await sendOfflineQueue(deviceId);
        }
      }
    } catch (err) {
      console.warn('Gönderim hatası, kuyruğa ekleniyor:', err);
      offlineQueue.push({ ...snapshot, timestamp: new Date().toISOString() });
      await saveOfflineQueue();
    }
  }, SEND_INTERVAL);
}

export function stopSending() {
  if (sendTimer) {
    clearInterval(sendTimer);
    sendTimer = null;
  }
}

async function sendOfflineQueue(deviceId) {
  if (offlineQueue.length === 0) return;
  try {
    await mApi('/sensors/batch', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId, data: offlineQueue }),
    });
    offlineQueue = [];
    await AsyncStorage.removeItem('cg_offline');
  } catch (e) {
    /* retry next time */
  }
}

async function saveOfflineQueue() {
  try {
    await AsyncStorage.setItem('cg_offline', JSON.stringify(offlineQueue));
  } catch (e) {}
}

export async function loadOfflineQueue() {
  try {
    const data = await AsyncStorage.getItem('cg_offline');
    offlineQueue = data ? JSON.parse(data) : [];
  } catch (e) {
    offlineQueue = [];
  }
}
