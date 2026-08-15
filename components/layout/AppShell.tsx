import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sidebar } from './Sidebar';
import { BottomNavigation } from './BottomNavigation';
import { GlobalHeader } from './GlobalHeader';
import { colors } from '../../constants';
import { useResponsive } from '../../hooks/useResponsive';

interface Props {
  children: React.ReactNode;
}

/** Reused by every top-level route: desktop sidebar + header, or mobile header + bottom nav. */
export function AppShell({ children }: Props) {
  const { isDesktop } = useResponsive();

  if (isDesktop) {
    return (
      <SafeAreaView style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
        <Sidebar />
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <GlobalHeader />
          <View style={{ flex: 1, backgroundColor: colors.background }}>{children}</View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <GlobalHeader />
      <View style={{ flex: 1, backgroundColor: colors.background }}>{children}</View>
      <BottomNavigation />
    </SafeAreaView>
  );
}
