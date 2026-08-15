import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DetailDrawer } from '../../../../components/common/DetailDrawer';
import { Text } from '../../../../components/common/Text';
import { Card } from '../../../../components/common/Card';
import { Button } from '../../../../components/common/Button';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { EmptyState } from '../../../../components/common/EmptyState';
import { RiskStateBadge } from '../../../../components/risk/RiskState';
import { SignalCard } from '../../../../components/signals/SignalCard';
import { useHermesData } from '../../../../hooks/HermesDataContext';
import { colors, spacing } from '../../../../constants';
import { formatDuration, formatPercent, formatPrice, formatSignedCurrency } from '../../../../utils/format';

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm }}>
      <Text variant="body" color="muted">
        {label}
      </Text>
      <Text variant="body" numeric style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </Text>
    </View>
  );
}

export default function PositionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { positions, bots, signals, activityEvents, closePosition } = useHermesData();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const position = positions.find((p) => p.id === id);

  if (!position) {
    return (
      <DetailDrawer title="Position" onClose={() => router.back()}>
        <EmptyState title="Posición no encontrada." description="Puede que ya haya sido cerrada." />
      </DetailDrawer>
    );
  }

  const bot = bots.find((b) => b.id === position.botId);
  const relatedSignal = signals.find((s) => s.id === position.relatedSignalId);
  const positive = position.unrealizedPnl >= 0;

  const handleConfirmClose = () => {
    closePosition(position.id);
    setConfirmVisible(false);
    router.back();
  };

  return (
    <DetailDrawer title={position.symbol} onClose={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <View>
          <Text variant="caption" color="muted">
            {position.direction === 'long' ? 'Long' : 'Short'} · {bot?.name ?? '—'}
          </Text>
          <Text variant="display" numeric style={{ color: positive ? colors.success : colors.danger }}>
            {formatSignedCurrency(position.unrealizedPnl)}
          </Text>
          <Text variant="body" numeric style={{ color: positive ? colors.success : colors.danger }}>
            {formatPercent(position.unrealizedPnlPct, { signed: true })}
          </Text>
        </View>

        <Card>
          <Row label="Entry price" value={formatPrice(position.entryPrice)} />
          <Row label="Current price" value={formatPrice(position.currentPrice)} />
          <Row label="Size" value={String(position.size)} />
          <Row label="Duration" value={formatDuration(position.openedAt)} />
        </Card>

        <Card>
          <Row label="Stop loss" value={position.stopLoss ? formatPrice(position.stopLoss) : '—'} />
          <Row label="Take profit" value={position.takeProfit ? formatPrice(position.takeProfit) : '—'} />
        </Card>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="body" color="muted">
            Risk
          </Text>
          <RiskStateBadge level={position.riskLevel} />
        </View>

        {relatedSignal ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" color="muted">
              RELATED SIGNAL
            </Text>
            <SignalCard
              signal={relatedSignal}
              relatedEvents={activityEvents.filter((e) => relatedSignal.relatedEventIds.includes(e.id))}
            />
          </View>
        ) : null}

        <Button label="Cerrar posición" variant="danger" onPress={() => setConfirmVisible(true)} fullWidth />
      </ScrollView>

      <ConfirmDialog
        visible={confirmVisible}
        title="Cerrar posición"
        description={`Vas a cerrar ${position.symbol}. Esta acción no se puede deshacer.`}
        confirmLabel="Cerrar posición"
        destructive
        onConfirm={handleConfirmClose}
        onCancel={() => setConfirmVisible(false)}
      />
    </DetailDrawer>
  );
}
