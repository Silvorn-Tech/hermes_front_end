import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DetailDrawer } from '../../../../components/common/DetailDrawer';
import { Text } from '../../../../components/common/Text';
import { Card } from '../../../../components/common/Card';
import { Badge } from '../../../../components/common/Badge';
import { Button } from '../../../../components/common/Button';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { EmptyState } from '../../../../components/common/EmptyState';
import { useHermesData } from '../../../../hooks/HermesDataContext';
import { colors, spacing } from '../../../../constants';
import { formatClock, formatOrDash, formatPrice } from '../../../../utils/format';
import { orderStatusLabel, orderStatusTone, orderTypeLabel } from '../../../../utils/orderDisplay';
import { generateIdempotencyKey } from '../../../../services/idempotency';
import { getErrorMessage, getRejectionMessage } from '../../../../services/errorMessages';
import { CANCELABLE_ORDER_STATUSES } from '../../../../types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm }}>
      <Text variant="body" color="muted">
        {label}
      </Text>
      <Text variant="body" numeric>
        {value}
      </Text>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { orders, bots, cancelOrder } = useHermesData();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Held for the lifetime of this screen instance so a retry of the same
  // cancel attempt reuses the same key — see services/idempotency.ts.
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <DetailDrawer title="Order" onClose={() => router.back()}>
        <EmptyState title="Orden no encontrada." description="Puede que ya haya sido cancelada o cargada de nuevo." />
      </DetailDrawer>
    );
  }

  const bot = bots.find((b) => b.id === order.botId);
  const canCancel = CANCELABLE_ORDER_STATUSES.includes(order.status);

  const handleConfirmCancel = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await cancelOrder(order.id, idempotencyKey);
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
    <DetailDrawer title={order.symbol} onClose={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="heading">{order.symbol}</Text>
          <Badge label={orderStatusLabel[order.status]} tone={orderStatusTone[order.status]} />
        </View>

        <Card>
          <Row label="Side" value={order.side === 'BUY' ? 'Compra' : 'Venta'} />
          <Row label="Order type" value={orderTypeLabel[order.type]} />
          <Row label="Origin" value={bot ? `Bot · ${bot.name}` : 'Manual'} />
          <Row label="Quantity" value={String(order.size)} />
          <Row label="Executed" value={formatOrDash(order.executedQuantity, String)} />
          <Row label="Price" value={order.type === 'MARKET' ? 'Market' : formatOrDash(order.price, formatPrice)} />
          <Row label="Avg. fill price" value={formatOrDash(order.averageFillPrice, formatPrice)} />
          <Row label="Timestamp" value={formatClock(order.timestamp)} />
          {order.binanceOrderId ? <Row label="Binance order id" value={order.binanceOrderId} /> : null}
        </Card>

        {order.errorMessage ? (
          <Card borderColor={colors.danger}>
            <Text variant="body" style={{ color: colors.danger }}>
              {order.errorMessage}
            </Text>
          </Card>
        ) : null}

        {submitError ? (
          <Text variant="body" style={{ color: colors.danger }}>
            {submitError}
          </Text>
        ) : null}

        {canCancel ? (
          <Button
            label="Cancelar orden"
            variant="danger"
            disabled={isSubmitting}
            onPress={() => setConfirmVisible(true)}
            fullWidth
          />
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmVisible}
        title="Cancelar orden"
        description={`Vas a cancelar la orden de ${order.symbol}. Esta acción no se puede deshacer.`}
        confirmLabel={isSubmitting ? 'Cancelando…' : 'Cancelar orden'}
        destructive
        onConfirm={() => {
          if (!isSubmitting) void handleConfirmCancel();
        }}
        onCancel={() => setConfirmVisible(false)}
      />
    </DetailDrawer>
  );
}
