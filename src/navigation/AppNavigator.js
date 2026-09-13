import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';

import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import ImportScreen from '../screens/ImportScreen';
import SenderSelectScreen from '../screens/SenderSelectScreen';
import ReviewScreen from '../screens/ReviewScreen';
import SavedPoliciesScreen from '../screens/SavedPoliciesScreen';
import DriveUploadScreen from '../screens/DriveUploadScreen';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.treeline, card: colors.treeline, text: colors.mist, border: colors.cardGlassBorder },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.treeline },
          animation: 'fade_from_bottom',
          headerStyle: { backgroundColor: colors.treeline },
          headerShadowVisible: false,
          headerTintColor: colors.lavender,
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Import" component={ImportScreen} options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="SenderSelect" component={SenderSelectScreen} options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="SavedPolicies" component={SavedPoliciesScreen} options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="DriveUpload" component={DriveUploadScreen} options={{ headerShown: true, title: '' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
