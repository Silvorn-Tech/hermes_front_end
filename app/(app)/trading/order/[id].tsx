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
import { formatClock, formatPrice } from '../../../../utils/format';

const statusLabel = { filled: 'Ejecutada', pending: 'Pendiente', cancelled: 'Cancelada', rejected: 'Rechazada' } as const;
const statusTone = { filled: colors.success, pending: colors.aiAccent, cancelled: colors.textMuted, rejected: colors.danger } as const;
const typeLabel = { market: 'Market', limit: 'Limit', stop: 'Stop' } as const;

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

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <DetailDrawer title="Order" onClose={() => router.back()}>
        <EmptyState title="Orden no encontrada." />
      </DetailDrawer>
    );
  }

  const bot = bots.find((b) => b.id === order.botId);

  return (
    <DetailDrawer title={order.symbol} onClose={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="heading">{order.symbol}</Text>
          <Badge label={statusLabel[order.status]} tone={statusTone[order.status]} />
        </View>

        <Card>
          <Row label="Order type" value={typeLabel[order.type]} />
          <Row label="Bot" value={bot?.name ?? '—'} />
          <Row label="Size" value={String(order.size)} />
          <Row label="Price" value={formatPrice(order.price)} />
          <Row label="Timestamp" value={formatClock(order.timestamp)} />
        </Card>

        {order.status === 'pending' ? (
          <Button label="Cancelar orden" variant="danger" onPress={() => setConfirmVisible(true)} fullWidth />
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmVisible}
        title="Cancelar orden"
        description={`Vas a cancelar la orden de ${order.symbol}. Esta acción no se puede deshacer.`}
        confirmLabel="Cancelar orden"
        destructive
        onConfirm={() => {
          cancelOrder(order.id);
          setConfirmVisible(false);
        }}
        onCancel={() => setConfirmVisible(false)}
      />
    </DetailDrawer>
  );
}
