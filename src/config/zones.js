// BTÜ Mimar Sinan Yerleşkesi - Varsayılan kampüs merkezi ve bölge tanımları
// Admin panelinden yeni bölgeler eklenebilir, bunlar veritabanında saklanır

const CAMPUS_CENTER = {
  lat: 40.2226,
  lng: 28.8700
};

const CAMPUS_ZOOM = 17;

// Varsayılan bölgeler (Supabase'e seed olarak eklenecek)
const DEFAULT_ZONES = [
  {
    name: 'Ana Bina',
    type: 'normal',
    max_capacity: 500,
    color: '#3b82f6',
    polygon: [
      [40.2230, 28.8690],
      [40.2230, 28.8700],
      [40.2225, 28.8700],
      [40.2225, 28.8690]
    ]
  },
  {
    name: 'Kütüphane',
    type: 'normal',
    max_capacity: 200,
    color: '#10b981',
    polygon: [
      [40.2228, 28.8705],
      [40.2228, 28.8712],
      [40.2224, 28.8712],
      [40.2224, 28.8705]
    ]
  },
  {
    name: 'Laboratuvar Binası',
    type: 'restricted',
    max_capacity: 100,
    color: '#f59e0b',
    polygon: [
      [40.2222, 28.8690],
      [40.2222, 28.8698],
      [40.2218, 28.8698],
      [40.2218, 28.8690]
    ]
  },
  {
    name: 'İnşaat Alanı',
    type: 'danger',
    max_capacity: 0,
    color: '#ef4444',
    polygon: [
      [40.2235, 28.8680],
      [40.2235, 28.8688],
      [40.2231, 28.8688],
      [40.2231, 28.8680]
    ]
  },
  {
    name: 'Otopark',
    type: 'normal',
    max_capacity: 150,
    color: '#8b5cf6',
    polygon: [
      [40.2220, 28.8715],
      [40.2220, 28.8725],
      [40.2215, 28.8725],
      [40.2215, 28.8715]
    ]
  },
  {
    name: 'Spor Alanı',
    type: 'normal',
    max_capacity: 300,
    color: '#06b6d4',
    polygon: [
      [40.2215, 28.8695],
      [40.2215, 28.8708],
      [40.2210, 28.8708],
      [40.2210, 28.8695]
    ]
  }
];

// Anomali tespiti için eşik değerleri
const THRESHOLDS = {
  NOISE_WARNING: 70,      // dB - uyarı seviyesi
  NOISE_CRITICAL: 85,     // dB - kritik seviye
  CROWD_WARNING: 0.7,     // %70 kapasite
  CROWD_CRITICAL: 0.9,    // %90 kapasite
  ACCELERATION_SPIKE: 20, // m/s² - anormal hareket
  MOTION_ZSCORE: 3,       // Z-score eşiği
  INACTIVITY_MINUTES: 30, // dakika - hareketsizlik süresi
  SPEED_LIMIT: 30         // km/h - kampüs hız limiti
};

module.exports = { CAMPUS_CENTER, CAMPUS_ZOOM, DEFAULT_ZONES, THRESHOLDS };
