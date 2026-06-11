// CampusGuard Mobile - Setup Device Modal Component
import React, { useState } from 'react';
import { View, Text, TextInput, Modal, StyleSheet, Platform } from 'react-native';
import GradientButton from './GradientButton';
import { COLORS, RADIUS, SIZES, SPACING } from '../config/theme';
import { mApi } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SetupModal({ visible, onDeviceRegistered }) {
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(false);

  const detectPlatform = () => {
    return Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iOS' : 'Web';
  };

  const handleSetup = async () => {
    if (!deviceName.trim()) {
      alert('Cihaz adı gerekli');
      return;
    }

    setLoading(true);
    try {
      const res = await mApi('/devices/register', {
        method: 'POST',
        body: JSON.stringify({
          device_name: deviceName.trim(),
          device_type: 'smartphone',
          platform: detectPlatform(),
        }),
      });
      if (res && res.device) {
        await AsyncStorage.setItem('cg_m_device', JSON.stringify(res.device));
        onDeviceRegistered(res.device);
      }
    } catch (err) {
      alert('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Cihaz Kaydet</Text>
          <Text style={styles.subtitle}>Veri göndermek için cihaz kaydı gerekli</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Cihaz Adı</Text>
            <TextInput
              style={styles.input}
              placeholder="Telefonumun adı"
              placeholderTextColor={COLORS.muted}
              value={deviceName}
              onChangeText={setDeviceName}
              autoFocus
            />
          </View>
          <GradientButton
            title="Kaydet ve Başla"
            onPress={handleSetup}
            loading={loading}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  card: {
    backgroundColor: COLORS.cardSolid,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxxl,
    paddingHorizontal: SPACING.xxl,
    width: '100%',
    maxWidth: 380,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.muted,
    marginBottom: SPACING.xl,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: SIZES.sm,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  input: {
    width: '100%',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    color: COLORS.text,
    fontSize: SIZES.base,
  },
});
