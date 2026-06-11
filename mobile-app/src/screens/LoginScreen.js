// CampusGuard Mobile - Login Screen
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableWithoutFeedback, Keyboard,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import AlertMessage from '../components/AlertMessage';
import GradientButton from '../components/GradientButton';
import { COLORS, RADIUS, SIZES, SPACING } from '../config/theme';
import { login } from '../services/authService';

const { width } = Dimensions.get('window');

export default function LoginScreen({ onLogin, onGoToRegister }) {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [alert, setAlert] = useState({ message: '', type: '', visible: false });
  const [loading, setLoading] = useState(false);

  const showAlert = (message, type) => {
    setAlert({ message, type, visible: true });
    setTimeout(() => setAlert(prev => ({ ...prev, visible: false })), 5000);
  };

  const handleLogin = async () => {
    if (!studentId.trim() || !password) {
      return showAlert('Tüm alanları doldurun', 'error');
    }

    setLoading(true);
    try {
      const data = await login(studentId.trim(), password);
      onLogin(data);
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.logo}>🛡️</Text>
              <Text 
                style={styles.title}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                CampusGuard
              </Text>
              <Text 
                style={styles.subtitle}
                numberOfLines={2}
                adjustsFontSizeToFit
              >
                Mobil Sensör Uygulaması
              </Text>

              <AlertMessage
                message={alert.message}
                type={alert.type}
                visible={alert.visible}
              />

              <View style={styles.formGroup}>
                <Text style={styles.label}>Öğrenci Numarası</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Öğrenci numaranızı girin"
                  placeholderTextColor={COLORS.muted}
                  value={studentId}
                  onChangeText={setStudentId}
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Şifre</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••"
                  placeholderTextColor={COLORS.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.buttonContainer}>
                <GradientButton
                  title="Giriş Yap"
                  onPress={handleLogin}
                  loading={loading}
                />
                <View style={{ height: SPACING.md }} />
                <GradientButton
                  title="Kayıt Ol"
                  variant="outline"
                  onPress={onGoToRegister}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.cardSolid,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    width: width > 440 ? 380 : '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  logo: {
    fontSize: SIZES.logo || 48,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: SIZES.xxxl || 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    fontSize: SIZES.md || 16,
    color: COLORS.muted,
    marginBottom: SPACING.xl,
    textAlign: 'center',
    width: '100%',
  },
  formGroup: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: SIZES.sm || 14,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  input: {
    width: '100%',
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
    paddingHorizontal: SPACING.base,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    color: COLORS.text,
    fontSize: SIZES.base || 16,
  },
  buttonContainer: {
    width: '100%',
    marginTop: SPACING.md,
  },
});
