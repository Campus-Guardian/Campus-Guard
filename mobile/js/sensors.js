// CampusGuard Mobile - Sensor Collection
let geoWatchId = null;
let motionListener = null;
let audioContext = null;
let analyser = null;
let micStream = null;
let noiseInterval = null;

let sensorData = {
  latitude: null, longitude: null,
  noise_level: null,
  acceleration_x: null, acceleration_y: null, acceleration_z: null,
  speed: null, battery_level: null, network_type: null
};

// GPS
function startGPS() {
  if (!navigator.geolocation) { console.warn('GPS desteklenmiyor'); return; }
  geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      sensorData.latitude = pos.coords.latitude;
      sensorData.longitude = pos.coords.longitude;
      sensorData.speed = pos.coords.speed ? (pos.coords.speed * 3.6) : 0; // m/s to km/h
      updateUI('sLocation', `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      updateUI('sSpeed', `${sensorData.speed.toFixed(1)} km/h`);
    },
    (err) => { console.warn('GPS hatası:', err); updateUI('sLocation', 'Erişim yok'); },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

function stopGPS() {
  if (geoWatchId !== null) { navigator.geolocation.clearWatch(geoWatchId); geoWatchId = null; }
}

// Accelerometer
function startAccelerometer() {
  if (typeof DeviceMotionEvent === 'undefined') { console.warn('İvmeölçer desteklenmiyor'); return; }
  
  // iOS 13+ requires permission
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission().then(state => {
      if (state === 'granted') addMotionListener();
    }).catch(console.error);
  } else {
    addMotionListener();
  }
}

function addMotionListener() {
  motionListener = (e) => {
    const a = e.accelerationIncludingGravity;
    if (a) {
      sensorData.acceleration_x = a.x ? parseFloat(a.x.toFixed(2)) : 0;
      sensorData.acceleration_y = a.y ? parseFloat(a.y.toFixed(2)) : 0;
      sensorData.acceleration_z = a.z ? parseFloat(a.z.toFixed(2)) : 0;
      const mag = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
      updateUI('sAccel', `${mag.toFixed(1)} m/s²`);
    }
  };
  window.addEventListener('devicemotion', motionListener);
}

function stopAccelerometer() {
  if (motionListener) { window.removeEventListener('devicemotion', motionListener); motionListener = null; }
}

// Microphone - Noise Level
async function startMicrophone() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    noiseInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      // Approximate dB (0-255 range to ~30-100 dB)
      const dB = Math.max(30, Math.min(100, 30 + (avg / 255) * 70));
      sensorData.noise_level = parseFloat(dB.toFixed(1));
      updateUI('sNoise', `${dB.toFixed(1)} dB`);
      // Color indicator
      const el = document.getElementById('sNoise');
      if (el) {
        if (dB >= 85) el.style.color = '#ef4444';
        else if (dB >= 70) el.style.color = '#f59e0b';
        else el.style.color = '#10b981';
      }
    }, 500);
  } catch (err) {
    console.warn('Mikrofon hatası:', err);
    updateUI('sNoise', 'Erişim yok');
  }
}

function stopMicrophone() {
  if (noiseInterval) { clearInterval(noiseInterval); noiseInterval = null; }
  if (audioContext) { audioContext.close(); audioContext = null; }
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
}

// Battery
async function getBattery() {
  try {
    if (navigator.getBattery) {
      const bat = await navigator.getBattery();
      sensorData.battery_level = Math.round(bat.level * 100);
      updateUI('sBattery', sensorData.battery_level + '%');
      bat.addEventListener('levelchange', () => {
        sensorData.battery_level = Math.round(bat.level * 100);
        updateUI('sBattery', sensorData.battery_level + '%');
      });
    }
  } catch (e) { console.warn('Batarya API yok'); }
}

// Network
function getNetwork() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  sensorData.network_type = conn ? conn.effectiveType : 'unknown';
}

// Helpers
function updateUI(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getSensorSnapshot() {
  getNetwork();
  return { ...sensorData };
}

function startAllSensors() {
  startGPS();
  startAccelerometer();
  startMicrophone();
  getBattery();
}

function stopAllSensors() {
  stopGPS();
  stopAccelerometer();
  stopMicrophone();
}
