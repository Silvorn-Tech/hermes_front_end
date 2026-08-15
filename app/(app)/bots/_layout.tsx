import { Stack } from 'expo-router';
import React from 'react';
import { colors } from '../../../constants';

export default function BotsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ presentation: 'transparentModal', animation: 'none' }} />
    </Stack>
  );
}
