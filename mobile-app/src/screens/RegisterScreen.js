// CampusGuard Mobile - Register Screen (2-step: BTU verify + password)
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Image, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AlertMessage from '../components/AlertMessage';
import GradientButton from '../components/GradientButton';
import { COLORS, RADIUS, SIZES, SPACING } from '../config/theme';
import { loadCaptcha, verifyStudent, register } from '../services/authService';

export default function RegisterScreen({ onGoToLogin, onRegistered }) {
  const [step, setStep] = useState(1);
  const [studentId, setStudentId] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [captchaImage, setCaptchaImage] = useState(null);
  const [verifiedStudentId, setVerifiedStudentId] = useState(null);
  const [nameHint, setNameHint] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [alert, setAlert] = useState({ message: '', type: '', visible: false });
  const [verifying, setVerifying] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const showAlert = (message, type) => {
    setAlert({ message, type, visible: true });
    setTimeout(() => setAlert(prev => ({ ...prev, visible: false })), 5000);
  };

  const fetchCaptcha = async () => {
    try {
      setCaptchaImage(null);
      const data = await loadCaptcha();
      setSessionId(data.sessionId);
      setCaptchaImage(data.captchaImage);
    } catch (err) {
      showAlert('CAPTCHA yüklenemedi: ' + err.message, 'error');
    }
  };

  const handleRefreshCaptcha = () => {
    setCaptchaInput('');
    fetchCaptcha();
  };

  const handleVerify = async () => {
    if (!studentId.trim()) {
      return showAlert('Öğrenci numarası gerekli', 'error');
    }
    if (!captchaInput.trim()) {
      return showAlert('Güvenlik kodunu girin', 'error');
    }
    if (!sessionId) {
      return showAlert('CAPTCHA yüklenemedi, yenileyin', 'error');
    }

    setVerifying(true);
    try {
      const data = await verifyStudent(sessionId, studentId.trim(), captchaInput.trim());
      if (data.verified) {
        setVerifiedStudentId(studentId.trim());
        if (data.nameHint) {
          setNameHint(data.nameHint);
        }
        setStep(2);
        showAlert('Öğrenci numarası doğrulandı!', 'success');
      } else {
        showAlert(data.message || 'Doğrulama başarısız', 'error');
        handleRefreshCaptcha();
      }
    } catch (err) {
      showAlert(err.message, 'error');
      handleRefreshCaptcha();
    } finally {
      setVerifying(false);
    }
  };

  const handleRegister = async () => {
    if (!password || password.length < 6) {
      return showAlert('Şifre en az 6 karakter olmalı', 'error');
    }
    if (password !== passwordConfirm) {
      return showAlert('Şifreler eşleşmiyor', 'error');
    }
    if (!verifiedStudentId) {
      return showAlert('Önce öğrenci numaranızı doğrulayın', 'error');
    }

    setRegistering(true);
    try {
      await register(verifiedStudentId, password);
      showAlert('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
      setTimeout(() => {
        resetForm();
        onRegistered(verifiedStudentId);
      }, 2000);
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setRegistering(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setStudentId('');
    setCaptchaInput('');
    setPassword('');
    setPasswordConfirm('');
    setSessionId(null);
    setCaptchaImage(null);
    setVerifiedStudentId(null);
    setNameHint(null);
  };

  const handleGoBack = () => {
    resetForm();
    onGoToLogin();
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
          >
            <View style={styles.card}>
              <Text style={styles.logo}>🎓</Text>
              <Text style={styles.title}>Kayıt Ol</Text>
              <Text style={styles.subtitle}>BTU öğrenci numaranızı doğrulayın</Text>

              <AlertMessage
                message={alert.message}
                type={alert.type}
                visible={alert.visible}
              />

              {/* Step 1: BTU Verify */}
              {step === 1 && (
                <View style={styles.stepContainer}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Öğrenci Numarası</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Öğrenci numaranız"
                      placeholderTextColor={COLORS.muted}
                      value={studentId}
                      onChangeText={setStudentId}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* CAPTCHA Section */}
                  <View style={styles.captchaSection}>
                    <Text style={styles.label}>Güvenlik Kodu</Text>
                    <View style={styles.captchaRow}>
                      {captchaImage ? (
                        <Image
                          source={{ uri: captchaImage }}
                          style={styles.captchaImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={[styles.captchaImage, styles.captchaPlaceholder]}>
                          <Text style={styles.captchaLoadingText}>Yükleniyor...</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.captchaRefreshBtn}
                        onPress={handleRefreshCaptcha}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.captchaRefreshIcon}>🔄</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.formGroup, { marginTop: SPACING.md }]}>
                      <TextInput
                        style={styles.input}
                        placeholder="Yukarıdaki kodu girin"
                        placeholderTextColor={COLORS.muted}
                        value={captchaInput}
                        onChangeText={setCaptchaInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  <GradientButton
                    title="Doğrula"
                    variant="warning"
                    onPress={handleVerify}
                    loading={verifying}
                  />
                </View>
              )}

              {/* Step 2: Password */}
              {step === 2 && (
                <View style={styles.stepContainer}>
                  <View style={styles.verifySuccess}>
                    <Text style={styles.verifyIcon}>✅</Text>
                    <Text style={styles.verifyText}>Öğrenci numarası doğrulandı!</Text>
                  </View>

                  {nameHint && (
                    <View style={styles.nameHintRow}>
                      <Text style={styles.nameHintIcon}>👤</Text>
                      <Text style={styles.nameHintText}>{nameHint}</Text>
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Şifre Belirleyin</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="En az 6 karakter"
                      placeholderTextColor={COLORS.muted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Şifre Tekrar</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Şifrenizi tekrar girin"
                      placeholderTextColor={COLORS.muted}
                      value={passwordConfirm}
                      onChangeText={setPasswordConfirm}
                      secureTextEntry
                    />
                  </View>

                  <GradientButton
                    title="Kaydı Tamamla"
                    onPress={handleRegister}
                    loading={registering}
                  />
                </View>
              )}

              <GradientButton
                title="Giriş'e Dön"
                variant="outline"
                onPress={handleGoBack}
                style={{ marginTop: SPACING.sm }}
              />
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
    padding: SPACING.xxl,
  },
  card: {
    backgroundColor: COLORS.cardSolid,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxxxl,
    paddingHorizontal: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logo: {
    fontSize: SIZES.logo,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: SIZES.xxxl,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.muted,
    marginBottom: SPACING.xxl,
  },
  stepContainer: {
    width: '100%',
  },
  formGroup: {
    width: '100%',
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

  // CAPTCHA
  captchaSection: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  captchaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: 6,
  },
  captchaImage: {
    flex: 1,
    height: 56,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  captchaPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captchaLoadingText: {
    fontSize: SIZES.sm,
    color: COLORS.muted,
  },
  captchaRefreshBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captchaRefreshIcon: {
    fontSize: 20,
  },

  // Verify Success
  verifySuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  verifyIcon: {
    fontSize: 20,
  },
  verifyText: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.success,
  },

  // Name Hint
  nameHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  nameHintIcon: {
    fontSize: 20,
  },
  nameHintText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.nameHint,
    letterSpacing: 1,
  },
});
