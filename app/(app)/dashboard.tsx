import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../components/common/Text';
import { SkeletonCard, SkeletonList } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { SignalStrip } from '../../components/signals/SignalStrip';
import { PerformanceCard } from '../../components/dashboard/PerformanceCard';
import { PositionsSummary } from '../../components/dashboard/PositionsSummary';
import { BotCard } from '../../components/bots/BotCard';
import { useHermesData } from '../../hooks/HermesDataContext';
import { useResponsive } from '../../hooks/useResponsive';
import { spacing } from '../../constants';
import { pickTopSignal } from '../../utils/signalPriority';
import { BotId } from '../../types';

export default function DashboardScreen() {
  const { status, portfolio, portfolioError, positions, positionsError, bots, signals, refresh } = useHermesData();
  const { isDesktop } = useResponsive();
  const router = useRouter();

  const getBotById = (id: BotId | undefined) => bots.find((b) => b.id === id);
  const topSignal = pickTopSignal(signals);

  if (status === 'loading') {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <SkeletonCard lines={1} />
        <SkeletonCard lines={4} />
        <SkeletonList rows={4} />
      </ScrollView>
    );
  }

  const bodyGap = spacing.xl;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: bodyGap, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
      {topSignal ? <SignalStrip signal={topSignal} onPress={() => router.push('/signals')} /> : null}

      {isDesktop ? (
        <View style={{ flexDirection: 'row', gap: bodyGap, alignItems: 'flex-start' }}>
          <View style={{ flex: 62 }}>
            {portfolioError ? (
              <ErrorState title="No se pudo cargar el portfolio." description={portfolioError} onRetry={refresh} />
            ) : (
              <PerformanceCard portfolio={portfolio} />
            )}
          </View>
          <View style={{ flex: 38, gap: spacing.md }}>
            {bots.map((bot) => (
              <BotCard key={bot.id} bot={bot} variant="compact" onPress={() => router.push(`/bots/${bot.id}` as any)} />
            ))}
          </View>
        </View>
      ) : (
        <>
          <PerformanceCard portfolio={portfolio} />
          <View style={{ gap: spacing.md }}>
            {bots.map((bot) => (
              <BotCard key={bot.id} bot={bot} variant="compact" onPress={() => router.push(`/bots/${bot.id}` as any)} />
            ))}
          </View>
        </>
      )}

      {positionsError ? (
        <ErrorState title="No se pudieron cargar las posiciones." description={positionsError} onRetry={refresh} />
      ) : (
        <PositionsSummary positions={positions} getBotById={getBotById} />
      )}
    </ScrollView>
  );
}
