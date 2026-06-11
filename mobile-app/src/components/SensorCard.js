// CampusGuard Mobile - Sensor Card Component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SIZES, SPACING } from '../config/theme';

export default function SensorCard({ icon, label, value, valueColor }) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardSolid,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    width: '48%',
  },
  icon: {
    fontSize: SIZES.icon,
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  value: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
});
