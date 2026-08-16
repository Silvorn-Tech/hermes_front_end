import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants';
import { useAppFonts } from '../hooks/useAppFonts';
import { HermesDataProvider } from '../hooks/HermesDataContext';
import { AuthProvider, useAuth } from '../hooks/AuthContext';

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <HermesDataProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </HermesDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Splits auth's own "still checking for a session" state from font loading
 * above, so the app never mounts the Login screen just to immediately swap
 * it for the Dashboard once a persisted session resolves.
 */
function RootNavigator() {
  const { isLoading, isAuthorized } = useAuth();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={isAuthorized}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthorized}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
