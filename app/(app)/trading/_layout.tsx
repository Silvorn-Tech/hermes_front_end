import { Stack } from 'expo-router';
import React from 'react';
import { colors } from '../../../constants';

export default function TradingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="position/[id]" options={{ presentation: 'transparentModal', animation: 'none' }} />
      <Stack.Screen name="order/[id]" options={{ presentation: 'transparentModal', animation: 'none' }} />
      <Stack.Screen name="new-order" options={{ presentation: 'transparentModal', animation: 'none' }} />
    </Stack>
  );
}
