// CampusGuard Mobile - App Screen (Main sensor view)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SensorCard from '../components/SensorCard';
import StatusIndicator from '../components/StatusIndicator';
import GradientButton from '../components/GradientButton';
import EmergencyModal from '../components/EmergencyModal';
import { mApi } from '../config/api';
import { COLORS, RADIUS, SIZES, SPACING } from '../config/theme';
import {
  startAllSensors, stopAllSensors, setOnSensorUpdate,
  getCurrentSensorData,
} from '../services/sensorService';
import {
  startSending, stopSending, loadOfflineQueue,
  setOnDataCountUpdate,
} from '../services/apiService';
import { logout } from '../services/authService';

export default function AppScreen({ onLogout }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [statusState, setStatusState] = useState('ready');
  const [statusText, setStatusText] = useState('Bağlanıyor...');
  const [statusSub, setStatusSub] = useState('Sensörler başlatılıyor');
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const [sensorDisplay, setSensorDisplay] = useState({
    location: 'Bekleniyor...',
    noise: '-- dB',
    noiseColor: null,
    accel: '-- m/s²',
    speed: '-- km/h',
    battery: '--%',
    dataCount: '0',
  });

  const isRunningRef = useRef(false);

  // Initialize app
  useEffect(() => {
    initApp();
    return () => {
      // Cleanup on unmount
      stopAllSensors();
      stopSending();
    };
  }, []);

  // Subscribe to sensor updates
  useEffect(() => {
    setOnSensorUpdate((data) => {
      setSensorDisplay(prev => {
        const updated = { ...prev };
        if (data.latitude != null && data.longitude != null) {
          updated.location = `${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`;
        }
        if (data.speed != null) {
          updated.speed = `${data.speed.toFixed(1)} km/h`;
        }
        if (data.noise_level != null) {
          updated.noise = `${data.noise_level.toFixed(1)} dB`;
          if (data.noise_level >= 85) updated.noiseColor = COLORS.danger;
          else if (data.noise_level >= 70) updated.noiseColor = COLORS.warning;
          else updated.noiseColor = COLORS.success;
        }
        if (data.acceleration_x != null) {
          const mag = Math.sqrt(
            data.acceleration_x ** 2 +
            data.acceleration_y ** 2 +
            data.acceleration_z ** 2
          );
          updated.accel = `${mag.toFixed(1)} m/s²`;
        }
        if (data.battery_level != null) {
          updated.battery = `${data.battery_level}%`;
        }
        return updated;
      });
    });

    setOnDataCountUpdate((count) => {
      setSensorDisplay(prev => ({ ...prev, dataCount: String(count) }));
    });

    return () => {
      setOnSensorUpdate(null);
      setOnDataCountUpdate(null);
    };
  }, []);

  const autoRegisterDevice = async (user) => {
    if (!user) {
      setStatusState('error');
      setStatusText('Hata');
      setStatusSub('Kullanıcı bilgisi bulunamadı, lütfen çıkış yapıp tekrar girin.');
      return;
    }
    setStatusState('loading');
    setStatusText('Cihaz kaydediliyor...');
    try {
      const detectPlatform = () => {
        return Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iOS' : 'Web';
      };
      const res = await mApi('/devices/register', {
        method: 'POST',
        body: JSON.stringify({
          student_id: user.student_id,
          device_name: user.student_id,
          device_type: 'smartphone',
          platform: detectPlatform(),
        }),
      });
      if (res && res.device) {
        await AsyncStorage.setItem('cg_m_device', JSON.stringify(res.device));
        setCurrentDevice(res.device);
        setStatusState('ready');
        setStatusText('Hazır');
        setStatusSub('Sensörleri başlatmak için butona basın');
      }
    } catch (err) {
      console.error('Auto register device error:', err);
      setStatusState('error');
      setStatusText('Kayıt Hatası');
      setStatusSub('Cihaz kaydedilemedi: ' + err.message);
    }
  };

  const initApp = async () => {
    await loadOfflineQueue();

    const savedUser = await AsyncStorage.getItem('cg_m_user');
    let currentUserObj = null;
    if (savedUser) {
      try {
        currentUserObj = JSON.parse(savedUser);
        setCurrentUser(currentUserObj);
      } catch (e) {
        console.error(e);
      }
    }

    const savedDevice = await AsyncStorage.getItem('cg_m_device');
    if (savedDevice) {
      try {
        const dev = JSON.parse(savedDevice);
        setCurrentDevice(dev);
        setStatusState('ready');
        setStatusText('Hazır');
        setStatusSub('Sensörleri başlatmak için butona basın');
      } catch (e) {
        await AsyncStorage.removeItem('cg_m_device');
        await autoRegisterDevice(currentUserObj);
      }
    } else {
      await autoRegisterDevice(currentUserObj);
    }
  };

  const handleToggleSensors = async () => {
    if (isRunningRef.current) {
      await handleStopSensors();
    } else {
      await handleStartSensors();
    }
  };

  const handleStartSensors = async () => {
    if (!currentDevice) {
      if (currentUser) {
        await autoRegisterDevice(currentUser);
      }
      return;
    }

    isRunningRef.current = true;
    setIsRunning(true);
    await startAllSensors();
    startSending(currentDevice.id);
    setStatusState('active');
    setStatusText('Aktif');
    setStatusSub('Sensör verileri gönderiliyor...');
  };

  const handleStopSensors = async () => {
    isRunningRef.current = false;
    setIsRunning(false);
    await stopAllSensors();
    stopSending();
    setStatusState('ready');
    setStatusText('Durduruldu');
    setStatusSub('Sensörler durduruldu');
  };

  const handleLogout = async () => {
    await handleStopSensors();
    await logout();
    onLogout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡️ CampusGuard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutIcon}>⏻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Status Card */}
        <StatusIndicator
          state={statusState}
          text={statusText}
          subText={statusSub}
        />

        {/* Sensor Grid */}
        <View style={styles.sensorGrid}>
          <SensorCard
            icon="📍"
            label="Konum"
            value={sensorDisplay.location}
          />
          <SensorCard
            icon="🔊"
            label="Gürültü"
            value={sensorDisplay.noise}
            valueColor={sensorDisplay.noiseColor}
          />
          <SensorCard
            icon="📐"
            label="İvme"
            value={sensorDisplay.accel}
          />
          <SensorCard
            icon="🏃"
            label="Hız"
            value={sensorDisplay.speed}
          />
          <SensorCard
            icon="🔋"
            label="Batarya"
            value={sensorDisplay.battery}
          />
          <SensorCard
            icon="📡"
            label="Veri Gönderim"
            value={sensorDisplay.dataCount}
          />
        </View>

        {/* Control Button */}
        <View style={styles.controls}>
          <GradientButton
            title={isRunning ? '⏹ Sensörleri Durdur' : '▶ Sensörleri Başlat'}
            variant={isRunning ? 'danger' : 'success'}
            onPress={handleToggleSensors}
          />
          {/* Acil Durum Butonu */}
          <TouchableOpacity
            style={styles.emergencyBtn}
            onPress={() => setEmergencyVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.emergencyBtnText}>🚨 Acil Durum</Text>
          </TouchableOpacity>
        </View>

        {/* Student Info */}
        {currentUser && (
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceText}>
              Öğrenci No: <Text style={styles.deviceName}>{currentUser.student_id}</Text>
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Acil Durum Modal */}
      <EmergencyModal
        visible={emergencyVisible}
        onClose={() => setEmergencyVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.cardSolid,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
  },
  logoutBtn: {
    padding: SPACING.sm,
  },
  logoutIcon: {
    fontSize: 20,
    color: COLORS.muted,
  },
  scrollView: {
    flex: 1,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  controls: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  deviceInfo: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xxl,
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.cardSolid,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
  },
  deviceText: {
    fontSize: SIZES.sm,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  deviceName: {
    fontWeight: '700',
    color: COLORS.text,
  },
  deviceId: {
    fontSize: SIZES.xs,
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emergencyBtn: {
    marginTop: SPACING.md,
    backgroundColor: '#ef4444',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  emergencyBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: SIZES.lg || 18,
    letterSpacing: 0.5,
  },
});
