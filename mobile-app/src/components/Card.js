// CampusGuard Mobile - Card Component
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../config/theme';

export default function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
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
  },
});
