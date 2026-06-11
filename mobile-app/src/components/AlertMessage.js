// CampusGuard Mobile - Alert Message Component
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SIZES, SPACING } from '../config/theme';

export default function AlertMessage({ message, type, visible }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && message) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(4000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
    }
  }, [visible, message]);

  if (!visible || !message) return null;

  const bgColor = type === 'error'
    ? 'rgba(239,68,68,0.15)'
    : 'rgba(16,185,129,0.15)';
  const textColor = type === 'error' ? COLORS.danger : COLORS.success;

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor, opacity }]}>
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  text: {
    fontSize: SIZES.md,
    fontWeight: '500',
  },
});
