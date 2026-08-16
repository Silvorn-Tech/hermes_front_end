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
import { formatDuration, formatOrDash, formatPercent, formatPrice, formatSignedCurrency } from '../../../../utils/format';
import { generateIdempotencyKey } from '../../../../services/idempotency';
import { getErrorMessage, getRejectionMessage } from '../../../../services/errorMessages';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Held for the lifetime of this screen instance so a retry of the same
  // close attempt reuses the same key — see services/idempotency.ts.
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

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
  const positive = (position.unrealizedPnl ?? 0) >= 0;

  const handleConfirmClose = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await closePosition(position.symbol, idempotencyKey);
      setConfirmVisible(false);
      if (result.status === 'REJECTED' || result.status === 'FAILED') {
        setSubmitError(getRejectionMessage(result.reason));
      } else {
        router.back();
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailDrawer title={position.symbol} onClose={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <View>
          <Text variant="caption" color="muted">
            {position.direction === 'long' ? 'Long' : 'Short'}
            {bot ? ` · ${bot.name}` : ''}
          </Text>
          <Text variant="display" numeric style={{ color: positive ? colors.success : colors.danger }}>
            {formatOrDash(position.unrealizedPnl, formatSignedCurrency)}
          </Text>
          <Text variant="body" numeric style={{ color: positive ? colors.success : colors.danger }}>
            {formatOrDash(position.unrealizedPnlPct, (v) => formatPercent(v, { signed: true }))}
          </Text>
        </View>

        <Card>
          <Row label="Entry price" value={formatOrDash(position.entryPrice, formatPrice)} />
          <Row label="Current price" value={formatOrDash(position.currentPrice, formatPrice)} />
          <Row label="Value" value={formatOrDash(position.valueQuote, formatPrice)} />
          <Row label="Size" value={String(position.size)} />
          {position.openedAt ? <Row label="Duration" value={formatDuration(position.openedAt)} /> : null}
        </Card>

        {position.stopLoss || position.takeProfit ? (
          <Card>
            <Row label="Stop loss" value={formatOrDash(position.stopLoss, formatPrice)} />
            <Row label="Take profit" value={formatOrDash(position.takeProfit, formatPrice)} />
          </Card>
        ) : null}

        {position.riskLevel ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="body" color="muted">
              Risk
            </Text>
            <RiskStateBadge level={position.riskLevel} />
          </View>
        ) : null}

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

        {submitError ? (
          <Text variant="body" style={{ color: colors.danger }}>
            {submitError}
          </Text>
        ) : null}

        <Button
          label="Cerrar posición"
          variant="danger"
          disabled={isSubmitting}
          onPress={() => setConfirmVisible(true)}
          fullWidth
        />
      </ScrollView>

      <ConfirmDialog
        visible={confirmVisible}
        title="Cerrar posición"
        description={`Vas a cerrar ${position.symbol}. Esta acción no se puede deshacer.`}
        confirmLabel={isSubmitting ? 'Cerrando…' : 'Cerrar posición'}
        destructive
        onConfirm={() => {
          if (!isSubmitting) void handleConfirmClose();
        }}
        onCancel={() => setConfirmVisible(false)}
      />
    </DetailDrawer>
  );
}
