import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../components/common/Text';
import { SkeletonCard, SkeletonList } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
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
  const { status, positions, positionsError, binanceNotConnected, bots, botsError, signals, refresh } = useHermesData();
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
            <PerformanceCard />
          </View>
          <View style={{ flex: 38, gap: spacing.md }}>
            {botsError ? (
              <ErrorState title="No se pudieron cargar los bots." description={botsError} onRetry={refresh} />
            ) : (
              bots.map((bot) => (
                <BotCard key={bot.id} bot={bot} variant="compact" onPress={() => router.push(`/bots/${bot.id}` as any)} />
              ))
            )}
          </View>
        </View>
      ) : (
        <>
          <PerformanceCard />
          <View style={{ gap: spacing.md }}>
            {botsError ? (
              <ErrorState title="No se pudieron cargar los bots." description={botsError} onRetry={refresh} />
            ) : (
              bots.map((bot) => (
                <BotCard key={bot.id} bot={bot} variant="compact" onPress={() => router.push(`/bots/${bot.id}` as any)} />
              ))
            )}
          </View>
        </>
      )}

      {binanceNotConnected ? (
        <View style={{ gap: spacing.md, alignItems: 'center' }}>
          <EmptyState
            title="Conectá tu cuenta de Binance"
            description="Para ver tu portfolio y posiciones reales, conectá tu propia cuenta de Binance desde Settings. Tus bots en Simulación no lo requieren."
          />
          <Button label="Ir a Settings" onPress={() => router.push('/settings')} />
        </View>
      ) : positionsError ? (
        <ErrorState title="No se pudieron cargar las posiciones." description={positionsError} onRetry={refresh} />
      ) : (
        <PositionsSummary positions={positions} getBotById={getBotById} />
      )}
    </ScrollView>
  );
}
