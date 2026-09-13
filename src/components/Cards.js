import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, fonts, radius, spacing, type } from '../theme/theme';

export function GlassCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StepHeader({ step, total, title, subtitle }) {
  return (
    <View style={styles.stepHeader}>
      <Text style={type.label}>
        STEP {step} OF {total}
      </Text>
      <Text style={[type.h1, styles.stepTitle]}>{title}</Text>
      {subtitle ? <Text style={type.bodyMuted}>{subtitle}</Text> : null}
    </View>
  );
}

export function PolicyRow({ number, dateStr, status, selected, onToggle, meta }) {
  const statusColor =
    status === 'saved' ? colors.success : status === 'exists' ? colors.hazeGold : status === 'error' ? colors.danger : colors.lavender;
  const statusLabel =
    status === 'saved' ? 'Ready' : status === 'exists' ? 'Already saved' : status === 'error' ? 'Failed' : status;

  return (
    <Pressable style={styles.policyRow} onPress={onToggle}>
      <View style={styles.policyCheckboxWrap}>
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected ? <View style={styles.checkboxInner} /> : null}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.policyNumber}>Policy #{number}</Text>
        <Text style={styles.policyMeta}>
          {dateStr}
          {meta ? `  ·  ${meta}` : ''}
        </Text>
      </View>
      <View style={[styles.statusPill, { borderColor: statusColor }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardGlass,
    borderWidth: 1,
    borderColor: colors.cardGlassBorder,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  stepHeader: { marginBottom: spacing.lg },
  stepTitle: { marginTop: spacing.xs, marginBottom: spacing.xs },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardGlassBorder,
  },
  policyCheckboxWrap: { marginRight: spacing.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.lavenderMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: colors.hazeGold },
  checkboxInner: { width: 12, height: 12, borderRadius: 4, backgroundColor: colors.hazeGold },
  policyNumber: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.mist },
  policyMeta: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(241,232,221,0.55)', marginTop: 2 },
  statusPill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: fonts.bodyMedium, fontSize: 11 },
});
