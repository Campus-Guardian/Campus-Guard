// CampusGuard Mobile - Emergency Modal
import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { mApi } from '../config/api';
import { COLORS, RADIUS, SIZES, SPACING } from '../config/theme';

export default function EmergencyModal({ visible, onClose }) {
  const [sending, setSending] = useState(false);

  const sendEmergency = async (category) => {
    setSending(true);
    try {
      await mApi('/alerts/emergency', {
        method: 'POST',
        body: JSON.stringify({ category }),
      });
      onClose();
      Alert.alert(
        '🚨 Acil Durum Gönderildi',
        `${category === 'health' ? '🏥 Sağlık' : '🔒 Güvenlik'} acil durumu bildiriminiz iletildi. Yardım yolda!`,
        [{ text: 'Tamam', style: 'cancel' }]
      );
    } catch (err) {
      console.error('Emergency send error:', err);
      Alert.alert(
        'Hata',
        'Acil durum gönderilemedi: ' + (err.message || 'Bilinmeyen hata'),
        [{ text: 'Tamam' }]
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Başlık */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🚨</Text>
            <Text style={styles.headerTitle}>Acil Durum</Text>
            <Text style={styles.headerSub}>
              Lütfen acil durum kategorisini seçin. Seçiminiz anında güvenlik birimine iletilecek.
            </Text>
          </View>

          {sending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.danger} />
              <Text style={styles.loadingText}>Gönderiliyor...</Text>
            </View>
          ) : (
            <View style={styles.categories}>
              {/* Sağlık */}
              <TouchableOpacity
                style={[styles.categoryBtn, styles.healthBtn]}
                onPress={() => sendEmergency('health')}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryIcon}>🏥</Text>
                <Text style={styles.categoryTitle}>Sağlık</Text>
                <Text style={styles.categorySub}>Yaralanma, hastalık, bayılma</Text>
              </TouchableOpacity>

              {/* Güvenlik */}
              <TouchableOpacity
                style={[styles.categoryBtn, styles.securityBtn]}
                onPress={() => sendEmergency('security')}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryIcon}>🔒</Text>
                <Text style={styles.categoryTitle}>Güvenlik</Text>
                <Text style={styles.categorySub}>Tehdit, saldırı, tehlikeli durum</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* İptal */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={sending}>
            <Text style={styles.cancelText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  container: {
    width: '100%',
    backgroundColor: COLORS.cardSolid || '#1a1a2e',
    borderRadius: RADIUS.lg || 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  header: {
    backgroundColor: '#ef4444',
    padding: SPACING.xl || 20,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: SIZES.xl || 22,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: SIZES.sm || 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  loadingContainer: {
    padding: SPACING.xxl || 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.muted || '#aaa',
    fontSize: SIZES.md || 15,
  },
  categories: {
    padding: SPACING.lg || 16,
    gap: 12,
    flexDirection: 'column',
  },
  categoryBtn: {
    borderRadius: RADIUS.md || 10,
    padding: SPACING.xl || 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  healthBtn: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: '#10b981',
  },
  securityBtn: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: '#ef4444',
    marginTop: 10,
  },
  categoryIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  categoryTitle: {
    fontSize: SIZES.lg || 18,
    fontWeight: '700',
    color: COLORS.text || '#fff',
    marginBottom: 4,
  },
  categorySub: {
    fontSize: SIZES.xs || 12,
    color: COLORS.muted || '#aaa',
    textAlign: 'center',
  },
  cancelBtn: {
    padding: SPACING.lg || 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border || '#2a2a3e',
  },
  cancelText: {
    color: COLORS.muted || '#aaa',
    fontSize: SIZES.md || 15,
    fontWeight: '600',
  },
});
