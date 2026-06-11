// CampusGuard Mobile - Sensor Service (Expo native APIs)
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import { Audio } from 'expo-av';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';

let locationSubscription = null;
let accelerometerSubscription = null;
let recording = null;
let noiseInterval = null;
let batteryInterval = null;

// Shared mutable sensor data
const sensorData = {
  latitude: null,
  longitude: null,
  noise_level: null,
  acceleration_x: null,
  acceleration_y: null,
  acceleration_z: null,
  speed: null,
  battery_level: null,
  network_type: null,
};

// Callback for UI updates
let onSensorUpdate = null;

export function setOnSensorUpdate(cb) {
  onSensorUpdate = cb;
}

function notify() {
  if (onSensorUpdate) onSensorUpdate({ ...sensorData });
}

// ========== GPS ==========
async function startGPS() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('GPS izni verilmedi');
      return;
    }
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 1,
      },
      (location) => {
        sensorData.latitude = location.coords.latitude;
        sensorData.longitude = location.coords.longitude;
        sensorData.speed = location.coords.speed && location.coords.speed > 0
          ? parseFloat((location.coords.speed * 3.6).toFixed(1))
          : 0;
        notify();
      }
    );
  } catch (err) {
    console.warn('GPS hatası:', err);
  }
}

function stopGPS() {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
}

// ========== Accelerometer ==========
function startAccelerometer() {
  try {
    Accelerometer.setUpdateInterval(500);
    accelerometerSubscription = Accelerometer.addListener((data) => {
      // Expo gives values in G's, multiply by 9.81 to get m/s²
      const x = parseFloat((data.x * 9.81).toFixed(2));
      const y = parseFloat((data.y * 9.81).toFixed(2));
      const z = parseFloat((data.z * 9.81).toFixed(2));
      sensorData.acceleration_x = x;
      sensorData.acceleration_y = y;
      sensorData.acceleration_z = z;
      notify();
    });
  } catch (err) {
    console.warn('İvmeölçer hatası:', err);
  }
}

function stopAccelerometer() {
  if (accelerometerSubscription) {
    accelerometerSubscription.remove();
    accelerometerSubscription = null;
  }
}

// ========== Microphone / Noise Level ==========
async function startMicrophone() {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Mikrofon izni verilmedi');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.LOW_QUALITY,
      isMeteringEnabled: true,
    });
    await recording.startAsync();

    // Read metering data every 500ms
    noiseInterval = setInterval(async () => {
      try {
        if (!recording) return;
        const status = await recording.getStatusAsync();
        if (status.isRecording && status.metering != null) {
          // metering is in dBFS (typically -160 to 0)
          // Convert to approximate dB SPL (30-100 range like the web version)
          const dbFS = status.metering;
          const dB = Math.max(30, Math.min(100, 100 + dbFS));
          sensorData.noise_level = parseFloat(dB.toFixed(1));
          notify();
        }
      } catch (e) {
        // recording may have been stopped
      }
    }, 500);
  } catch (err) {
    console.warn('Mikrofon hatası:', err);
  }
}

async function stopMicrophone() {
  if (noiseInterval) {
    clearInterval(noiseInterval);
    noiseInterval = null;
  }
  if (recording) {
    try {
      await recording.stopAndUnloadAsync();
    } catch (e) { /* already stopped */ }
    recording = null;
  }
}

// ========== Battery ==========
async function getBattery() {
  try {
    const level = await Battery.getBatteryLevelAsync();
    sensorData.battery_level = level >= 0 ? Math.round(level * 100) : null;
    notify();
  } catch (e) {
    console.warn('Batarya API hatası:', e);
  }
}

// ========== Network ==========
async function getNetwork() {
  try {
    const state = await Network.getNetworkStateAsync();
    if (state.type) {
      sensorData.network_type = state.type.toLowerCase();
    } else {
      sensorData.network_type = state.isConnected ? 'unknown' : 'none';
    }
  } catch (e) {
    sensorData.network_type = 'unknown';
  }
}

// ========== Public API ==========
export function getSensorSnapshot() {
  getNetwork();
  return {
    latitude: sensorData.latitude,
    longitude: sensorData.longitude,
    noise_level: sensorData.noise_level,
    acceleration_x: sensorData.acceleration_x,
    acceleration_y: sensorData.acceleration_y,
    acceleration_z: sensorData.acceleration_z,
    speed: sensorData.speed,
    battery_level: sensorData.battery_level,
    network_type: sensorData.network_type,
  };
}

export async function startAllSensors() {
  await startGPS();
  startAccelerometer();
  await startMicrophone();
  await getBattery();
  // Refresh battery periodically
  batteryInterval = setInterval(getBattery, 30000);
}

export async function stopAllSensors() {
  stopGPS();
  stopAccelerometer();
  await stopMicrophone();
  if (batteryInterval) {
    clearInterval(batteryInterval);
    batteryInterval = null;
  }
}

export function getCurrentSensorData() {
  return { ...sensorData };
}
