// CampusGuard Mobile - Gradient Button Component
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SIZES, SPACING, FONTS } from '../config/theme';

export default function GradientButton({
  title,
  onPress,
  variant = 'primary', // primary, success, danger, warning, outline
  loading = false,
  style,
}) {
  const gradients = {
    primary: [COLORS.primary, COLORS.primaryDark],
    success: [COLORS.success, COLORS.successDark],
    danger: [COLORS.danger, COLORS.dangerDark],
    warning: [COLORS.warning, COLORS.warningDark],
  };

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={[styles.button, styles.outline, style]}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={loading}
      >
        <Text style={[styles.text, { color: COLORS.muted }]}>{title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={loading}
      style={style}
    >
      <LinearGradient
        colors={gradients[variant] || gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: SPACING.base,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  text: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: '#ffffff',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
