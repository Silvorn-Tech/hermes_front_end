import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/common/Text';
import { Tabs } from '../../../components/common/Tabs';
import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { SkeletonList } from '../../../components/common/LoadingSkeleton';
import { PositionRow, PositionTableHeader } from '../../../components/trading/PositionRow';
import { PositionCard } from '../../../components/trading/PositionCard';
import { OrderRow, OrderTableHeader, OrderCard } from '../../../components/trading/OrderRow';
import { useHermesData } from '../../../hooks/HermesDataContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { colors, radius, spacing } from '../../../constants';
import { BotId } from '../../../types';

const mainTabs = [
  { key: 'positions', label: 'Positions' },
  { key: 'orders', label: 'Orders' },
];

const densityTabs = [
  { key: 'comfortable', label: 'Comfortable' },
  { key: 'compact', label: 'Compact' },
];

export default function TradingScreen() {
  const { status, positions, positionsError, orders, ordersError, bots, refreshPositions, refreshOrders } =
    useHermesData();
  const { isDesktop } = useResponsive();
  const router = useRouter();
  const [tab, setTab] = useState<'positions' | 'orders'>('positions');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const getBot = (id: BotId | undefined) => bots.find((b) => b.id === id);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, maxWidth: 1280, width: '100%', alignSelf: 'center' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <Text variant="display">Trading</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Tabs items={mainTabs} activeKey={tab} onChange={(k) => setTab(k as typeof tab)} />
          {isDesktop && tab === 'positions' ? (
            <Tabs items={densityTabs} activeKey={density} onChange={(k) => setDensity(k as typeof density)} />
          ) : null}
          <Button label="Nueva orden" onPress={() => router.push('/trading/new-order' as any)} />
        </View>
      </View>

      {status === 'loading' ? (
        <SkeletonList rows={5} />
      ) : tab === 'positions' ? (
        positionsError ? (
          <ErrorState title="No se pudieron cargar las posiciones." description={positionsError} onRetry={refreshPositions} />
        ) : positions.length === 0 ? (
          <EmptyState title="No hay posiciones abiertas." />
        ) : isDesktop ? (
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' }}>
            <PositionTableHeader />
            {positions.map((p) => (
              <PositionRow
                key={p.id}
                position={p}
                bot={getBot(p.botId)}
                density={density}
                onPress={() => router.push(`/trading/position/${p.id}` as any)}
              />
            ))}
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {positions.map((p) => (
              <PositionCard key={p.id} position={p} bot={getBot(p.botId)} onPress={() => router.push(`/trading/position/${p.id}` as any)} />
            ))}
          </View>
        )
      ) : ordersError ? (
        <ErrorState title="No se pudieron cargar las órdenes." description={ordersError} onRetry={refreshOrders} />
      ) : orders.length === 0 ? (
        <EmptyState title="No hay órdenes registradas." />
      ) : isDesktop ? (
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' }}>
          <OrderTableHeader />
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} bot={getBot(o.botId)} onPress={() => router.push(`/trading/order/${o.id}` as any)} />
          ))}
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} bot={getBot(o.botId)} onPress={() => router.push(`/trading/order/${o.id}` as any)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
