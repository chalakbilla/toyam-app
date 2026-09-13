import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Easing } from 'react-native';
import { colors, fonts } from '../theme/theme';

// Renders "Toyam" one letter at a time, like light slowly finding its way
// through the treeline in the reference image. Used on the splash screen and
// as a quiet header mark on every screen after.
export default function ToyamWordmark({ size = 46, animated = false, style }) {
  const letters = 'Toyam'.split('');
  const opacities = useRef(letters.map(() => new Animated.Value(animated ? 0 : 1))).current;

  useEffect(() => {
    if (!animated) return;
    Animated.stagger(
      110,
      opacities.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [animated]);

  return (
    <View style={[styles.row, style]}>
      {letters.map((letter, i) => (
        <Animated.Text
          key={i}
          style={{
            fontFamily: fonts.display,
            fontSize: size,
            color: colors.mist,
            letterSpacing: 1,
            opacity: opacities[i],
            transform: [
              {
                translateY: opacities[i].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
              },
            ],
          }}
        >
          {letter}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
