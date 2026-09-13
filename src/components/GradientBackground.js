import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, backgroundGradient } from '../theme/theme';

// Soft out-of-focus "bokeh" discs, positioned to echo the warm haze the
// couple in the reference photo is walking toward — never literal, just the
// same light logic: dark treeline, a gap of warm light, lavender below.
export default function GradientBackground({ children, style }) {
  return (
    <View style={[styles.fill, style]}>
      <LinearGradient colors={backgroundGradient} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} />
      <View pointerEvents="none" style={[styles.orb, styles.orbGold]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbLavender]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.35,
  },
  orbGold: {
    width: 260,
    height: 260,
    backgroundColor: colors.hazeGold,
    top: '18%',
    left: '30%',
    opacity: 0.22,
  },
  orbLavender: {
    width: 320,
    height: 320,
    backgroundColor: colors.lavender,
    bottom: -80,
    right: -60,
    opacity: 0.28,
  },
});
