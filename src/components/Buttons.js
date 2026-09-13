import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme/theme';

export function PrimaryButton({ label, onPress, loading, disabled, tone = 'gold' }) {
  const bg = tone === 'gold' ? colors.hazeGold : tone === 'danger' ? colors.danger : colors.mist;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryLabel}>{label}</Text>}
    </Pressable>
  );
}

export function GhostButton({ label, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.ghost, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}
    >
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <View style={[styles.chipDot, selected && styles.chipDotSelected]} />
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    paddingVertical: 15,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  ghost: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.lavender },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cardGlassBorder,
    backgroundColor: colors.cardGlass,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: { borderColor: colors.hazeGold, backgroundColor: 'rgba(231, 199, 156, 0.16)' },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.lavenderMuted,
    marginRight: 8,
  },
  chipDotSelected: { backgroundColor: colors.hazeGold, borderColor: colors.hazeGold },
  chipLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.mist },
  chipLabelSelected: { fontFamily: fonts.bodyMedium, color: colors.hazeGold },
});
