-- CampusGuard Veritabanı Şeması
-- Supabase SQL Editor'de çalıştırılacak

-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  student_id VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cihazlar tablosu
CREATE TABLE IF NOT EXISTS devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(100) DEFAULT 'smartphone',
  platform VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ,
  last_latitude DOUBLE PRECISION,
  last_longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensör verileri tablosu (time series)
CREATE TABLE IF NOT EXISTS sensor_data (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  noise_level DOUBLE PRECISION,
  acceleration_x DOUBLE PRECISION,
  acceleration_y DOUBLE PRECISION,
  acceleration_z DOUBLE PRECISION,
  acceleration_magnitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  battery_level DOUBLE PRECISION,
  network_type VARCHAR(50)
);

-- Bölgeler tablosu
CREATE TABLE IF NOT EXISTS zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) DEFAULT 'normal' CHECK (type IN ('normal', 'restricted', 'danger')),
  polygon JSONB NOT NULL,
  max_capacity INTEGER DEFAULT 100,
  color VARCHAR(20) DEFAULT '#3b82f6',
  description TEXT,
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alarmlar tablosu
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'noise_warning', 'noise_critical',
    'crowd_warning', 'crowd_critical',
    'restricted_zone', 'danger_zone',
    'abnormal_motion', 'speed_violation',
    'inactivity', 'environmental',
    'emergency_health', 'emergency_security'
  )),
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  details JSONB,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kalabalık yoğunluğu tablosu
CREATE TABLE IF NOT EXISTS crowd_density (
  id BIGSERIAL PRIMARY KEY,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  device_count INTEGER DEFAULT 0,
  density_level VARCHAR(20) DEFAULT 'low' CHECK (density_level IN ('low', 'medium', 'high', 'critical')),
  capacity_ratio DOUBLE PRECISION DEFAULT 0
);

-- İndeksler (sorgu performansı)
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_time ON sensor_data(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);
CREATE INDEX IF NOT EXISTS idx_crowd_density_zone_time ON crowd_density(zone_id, timestamp DESC);

-- RLS devre dışı (auth backend'de yönetiliyor)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_density DISABLE ROW LEVEL SECURITY;

-- Varsayılan admin kullanıcısı (şifre: admin123)
-- bcrypt hash for 'admin123'
INSERT INTO users (email, password_hash, full_name, role) 
VALUES ('admin@campusguard.com', '$2a$10$JOspvefD8KZk4abF/srJset96uRzUbBUqI/OGZzFoti11y57XKCHG', 'Admin', 'admin')
ON CONFLICT (email) DO NOTHING;
