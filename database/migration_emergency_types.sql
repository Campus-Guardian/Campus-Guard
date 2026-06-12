-- =============================================================
-- CampusGuard - Acil Durum Alert Tipi Migration
-- Supabase SQL Editor'de çalıştırın
-- =============================================================

-- 1. Mevcut CHECK constraint'i kaldır
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;

-- 2. Yeni constraint'i ekle (emergency tipleri dahil)
ALTER TABLE alerts ADD CONSTRAINT alerts_alert_type_check
  CHECK (alert_type IN (
    'noise_warning', 'noise_critical',
    'crowd_warning', 'crowd_critical',
    'restricted_zone', 'danger_zone',
    'abnormal_motion', 'speed_violation',
    'inactivity', 'environmental',
    'emergency_health', 'emergency_security'
  ));

-- Doğrulama: Constraint güncellendi mi?
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'alerts'::regclass 
  AND conname = 'alerts_alert_type_check';
