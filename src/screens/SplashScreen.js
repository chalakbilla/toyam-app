import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import GradientBackground from '../components/GradientBackground';
import ToyamWordmark from '../components/ToyamWordmark';
import { type } from '../theme/theme';

export default function SplashScreen({ navigation }) {
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(taglineOpacity, { toValue: 1, duration: 700, delay: 900, useNativeDriver: true }).start();
    const timer = setTimeout(() => navigation.replace('Home'), 2400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GradientBackground style={styles.center}>
      <ToyamWordmark animated size={52} />
      <Animated.Text style={[type.bodyMuted, styles.tagline, { opacity: taglineOpacity }]}>
        Policies, gathered quietly
      </Animated.Text>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  tagline: { marginTop: 14, letterSpacing: 0.4 },
});
