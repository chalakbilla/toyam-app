import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ShareIntentProvider } from 'expo-share-intent';
import {
  useFonts as useCormorant,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import { useFonts as useInter, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

import AppNavigator from './src/navigation/AppNavigator';
import { ImportProvider } from './src/context/ImportContext';
import { colors } from './src/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [cormorantLoaded] = useCormorant({ CormorantGaramond_600SemiBold, CormorantGaramond_600SemiBold_Italic });
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const ready = cormorantLoaded && interLoaded;

  const onLayout = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.treeline }} onLayout={onLayout}>
      <ShareIntentProvider options={{ debug: false, resetOnBackground: true }}>
        <ImportProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </ImportProvider>
      </ShareIntentProvider>
    </GestureHandlerRootView>
  );
}
