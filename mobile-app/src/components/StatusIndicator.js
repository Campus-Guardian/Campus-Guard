// CampusGuard Mobile - Status Indicator Component
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SIZES, SPACING } from '../config/theme';

export default function StatusIndicator({ state, text, subText }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'active') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  const dotColor = state === 'active'
    ? COLORS.success
    : state === 'error'
      ? COLORS.danger
      : COLORS.muted;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: dotColor, opacity: pulseAnim },
          state === 'active' && styles.activeShadow,
        ]}
      />
      <View>
        <Text style={styles.text}>{text}</Text>
        <Text style={styles.subText}>{subText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    margin: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.cardSolid,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  activeShadow: {
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  subText: {
    fontSize: SIZES.sm,
    color: COLORS.muted,
  },
});
