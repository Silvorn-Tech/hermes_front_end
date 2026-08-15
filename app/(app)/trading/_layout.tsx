import { Stack } from 'expo-router';
import React from 'react';

export default function TradingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="position/[id]" options={{ presentation: 'transparentModal', animation: 'none' }} />
      <Stack.Screen name="order/[id]" options={{ presentation: 'transparentModal', animation: 'none' }} />
    </Stack>
  );
}
