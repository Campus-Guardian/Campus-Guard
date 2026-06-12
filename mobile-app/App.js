// CampusGuard Mobile - React Native + Expo
// Ana giriş noktası - Ekran geçişleri yönetimi
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AppScreen from './src/screens/AppScreen';
import { COLORS } from './src/config/theme';
import { getToken } from './src/config/api';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [prefilledStudentId, setPrefilledStudentId] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        setCurrentScreen('app');
      } else {
        setCurrentScreen('login');
      }
    } catch (e) {
      setCurrentScreen('login');
    }
  };

  // Loading screen
  if (currentScreen === 'loading') {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Login
  if (currentScreen === 'login') {
    return (
      <LoginScreen
        prefilledStudentId={prefilledStudentId}
        onLogin={() => setCurrentScreen('app')}
        onGoToRegister={() => setCurrentScreen('register')}
      />
    );
  }

  // Register
  if (currentScreen === 'register') {
    return (
      <RegisterScreen
        onGoToLogin={() => setCurrentScreen('login')}
        onRegistered={(studentId) => {
          setPrefilledStudentId(studentId);
          setCurrentScreen('login');
        }}
      />
    );
  }

  // App
  return (
    <AppScreen
      onLogout={() => {
        setPrefilledStudentId('');
        setCurrentScreen('login');
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
