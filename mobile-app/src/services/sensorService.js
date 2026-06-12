import { AppState, Platform } from 'react-native';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { Accelerometer } from 'expo-sensors';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { LOCATION_TASK } from '../backgroundTasks';
import { evaluateLocalZones } from './zoneCache';

let locationSubscription = null;
let accelerometerSubscription = null;
let batteryTimer = null;
let networkTimer = null;
let audioRecorder = null;
let audioMeterTimer = null;
let audioRotateTimer = null;
let stoppingAudio = false;
let onSensorUpdate = null;

const aggregates = {
  accelerationCount: 0,
  accelerationMin: null,
  accelerationMax: null,
  noiseSamples: [],
};

const sensorData = {
  latitude: null,
  longitude: null,
  location_accuracy: null,
  noise_level: null,
  noise_peak: null,
  acceleration_x: null,
  acceleration_y: null,
  acceleration_z: null,
  speed: null,
  battery_level: null,
  network_type: null,
};

function notify() {
  onSensorUpdate?.({ ...sensorData });
}

export function setOnSensorUpdate(callback) {
  onSensorUpdate = callback;
}

function updateLocation(location) {
  sensorData.latitude = location.coords.latitude;
  sensorData.longitude = location.coords.longitude;
  sensorData.location_accuracy = location.coords.accuracy ?? null;
  sensorData.speed = location.coords.accuracy <= 25 && location.coords.speed != null
    ? Math.max(0, Number((location.coords.speed * 3.6).toFixed(1)))
    : null;
  evaluateLocalZones({
    latitude: sensorData.latitude,
    longitude: sensorData.longitude,
    accuracy: sensorData.location_accuracy,
  }).catch(() => {});
  notify();
}

async function startLocation() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') throw new Error('Konum izni gerekli');
  const background = await Location.requestBackgroundPermissionsAsync();

  locationSubscription = await Location.watchPositionAsync({
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 1,
  }, updateLocation);

  if (
    background.status === 'granted'
    && !await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)
  ) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 2,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      activityType: Location.ActivityType.Fitness,
      foregroundService: {
        notificationTitle: 'CampusGuard aktif',
        notificationBody: 'Kampus guvenligi icin sensor verileri toplanıyor.',
        killServiceOnDestroy: false,
      },
    });
  }
}

function startAccelerometer() {
  Accelerometer.setUpdateInterval(200);
  accelerometerSubscription = Accelerometer.addListener((value) => {
    const x = Number((value.x * 9.80665).toFixed(3));
    const y = Number((value.y * 9.80665).toFixed(3));
    const z = Number((value.z * 9.80665).toFixed(3));
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    sensorData.acceleration_x = x;
    sensorData.acceleration_y = y;
    sensorData.acceleration_z = z;
    aggregates.accelerationCount += 1;
    aggregates.accelerationMin = aggregates.accelerationMin == null
      ? magnitude
      : Math.min(aggregates.accelerationMin, magnitude);
    aggregates.accelerationMax = aggregates.accelerationMax == null
      ? magnitude
      : Math.max(aggregates.accelerationMax, magnitude);
    notify();
  });
}

function removeTemporaryAudio(uri) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The operating system may already have removed the cache file.
  }
}

async function stopAudioChunk() {
  const recorder = audioRecorder;
  audioRecorder = null;
  if (!recorder) return;
  try {
    await recorder.stop();
  } catch {
    // Recording may have been interrupted by the operating system.
  }
  removeTemporaryAudio(recorder.uri || recorder.getStatus?.().url);
  recorder.remove?.();
}

async function startAudioChunk() {
  const options = {
    ...RecordingPresets.LOW_QUALITY,
    directory: 'cache',
    isMeteringEnabled: true,
    numberOfChannels: 1,
    sampleRate: 16000,
    bitRate: 24000,
  };
  audioRecorder = new AudioModule.AudioRecorder(options);
  await audioRecorder.prepareToRecordAsync(options);
  audioRecorder.record();
}

async function rotateAudioChunk() {
  if (stoppingAudio) return;
  await stopAudioChunk();
  await startAudioChunk();
}

async function startMicrophone() {
  const permission = await AudioModule.requestRecordingPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Mikrofon izni gerekli');
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'mixWithOthers',
  });
  await startAudioChunk();

  audioMeterTimer = setInterval(() => {
    const metering = audioRecorder?.getStatus?.().metering;
    if (metering == null) return;
    const estimatedDb = Math.max(30, Math.min(120, 100 + metering));
    aggregates.noiseSamples.push(estimatedDb);
    sensorData.noise_level = Number(estimatedDb.toFixed(1));
    sensorData.noise_peak = Number(Math.max(
      sensorData.noise_peak || 0,
      estimatedDb,
    ).toFixed(1));
    notify();
  }, 250);
  audioRotateTimer = setInterval(() => {
    rotateAudioChunk().catch((error) => console.warn('Audio rotation error:', error.message));
  }, 5000);
}

async function updateBattery() {
  const level = await Battery.getBatteryLevelAsync();
  sensorData.battery_level = level >= 0 ? Math.round(level * 100) : null;
  notify();
}

async function updateNetwork() {
  const state = await Network.getNetworkStateAsync();
  sensorData.network_type = state.isConnected ? String(state.type || 'unknown').toLowerCase() : 'none';
}

export async function startAllSensors() {
  await Promise.all([startLocation(), startMicrophone()]);
  startAccelerometer();
  await Promise.all([updateBattery(), updateNetwork()]);
  batteryTimer = setInterval(() => updateBattery().catch(() => {}), 30000);
  networkTimer = setInterval(() => updateNetwork().catch(() => {}), 15000);
}

export async function stopAllSensors() {
  locationSubscription?.remove();
  locationSubscription = null;
  accelerometerSubscription?.remove();
  accelerometerSubscription = null;
  clearInterval(batteryTimer);
  clearInterval(networkTimer);
  clearInterval(audioMeterTimer);
  clearInterval(audioRotateTimer);
  batteryTimer = null;
  networkTimer = null;
  audioMeterTimer = null;
  audioRotateTimer = null;
  stoppingAudio = true;
  await stopAudioChunk();
  stoppingAudio = false;
  await setAudioModeAsync({ allowsRecording: false, shouldPlayInBackground: false }).catch(() => {});
  if (Platform.OS !== 'web' && await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

export function getSensorSnapshot() {
  const noise = aggregates.noiseSamples;
  const noiseAverage = noise.length
    ? noise.reduce((sum, value) => sum + value, 0) / noise.length
    : sensorData.noise_level;
  const noisePeak = noise.length ? Math.max(...noise) : sensorData.noise_peak;
  const x = sensorData.acceleration_x;
  const y = sensorData.acceleration_y;
  const z = sensorData.acceleration_z;
  const magnitude = [x, y, z].every((value) => value != null)
    ? Math.sqrt(x * x + y * y + z * z)
    : null;

  const snapshot = {
    ...sensorData,
    noise_level: noiseAverage == null ? null : Number(noiseAverage.toFixed(1)),
    noise_peak: noisePeak == null ? null : Number(noisePeak.toFixed(1)),
    acceleration_magnitude: magnitude == null ? null : Number(magnitude.toFixed(3)),
    app_state: AppState.currentState === 'active' ? 'foreground' : 'background',
    sample_quality: {
      source: 'native_expo_modules',
      acceleration_samples: aggregates.accelerationCount,
      acceleration_min_magnitude: aggregates.accelerationMin,
      acceleration_max_magnitude: aggregates.accelerationMax,
      noise_samples: noise.length,
    },
  };

  aggregates.accelerationCount = 0;
  aggregates.accelerationMin = null;
  aggregates.accelerationMax = null;
  aggregates.noiseSamples = [];
  sensorData.noise_peak = null;
  return snapshot;
}

export function getCurrentSensorData() {
  return { ...sensorData };
}
