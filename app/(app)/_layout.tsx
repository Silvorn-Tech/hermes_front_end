import { Slot } from 'expo-router';
import React from 'react';
import { AppShell } from '../../components/layout/AppShell';

export default function AppGroupLayout() {
  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}
