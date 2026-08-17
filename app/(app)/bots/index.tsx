import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/common/Text';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { SkeletonCard } from '../../../components/common/LoadingSkeleton';
import { Button } from '../../../components/common/Button';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { BotCard } from '../../../components/bots/BotCard';
import { useHermesData } from '../../../hooks/HermesDataContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { colors, spacing } from '../../../constants';
import { generateIdempotencyKey } from '../../../services/idempotency';
import { getErrorMessage, getRejectionMessage } from '../../../services/errorMessages';
import { Bot } from '../../../types';

export default function BotsScreen() {
  const { status, bots, botsError, refreshBots, deleteBot } = useHermesData();
  const { isDesktop } = useResponsive();
  const router = useRouter();

  const [deleteTarget, setDeleteTarget] = useState<Bot | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const runDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteBot(deleteTarget.id, generateIdempotencyKey());
      if (result.status === 'DELETED') {
        setDeleteTarget(null);
      } else {
        // REJECTED (e.g. the bot stopped being PAUSED/STOPPED between
        // opening this dialog and confirming it) — show why, don't just
        // silently close as if it worked.
        setDeleteError(getRejectionMessage(result.reason));
      }
    } catch (error) {
      setDeleteError(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === 'loading') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.xxl, maxWidth: 1280, width: '100%', alignSelf: 'center' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <Text variant="display">Bots</Text>
        <Button label="Nuevo bot" onPress={() => router.push('/bots/form' as any)} />
      </View>

      {botsError ? (
        <ErrorState title="No se pudieron cargar los bots." description={botsError} onRetry={refreshBots} />
      ) : bots.length === 0 ? (
        <EmptyState title="Creá un bot para empezar a operar." />
      ) : (
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            flexWrap: isDesktop ? 'wrap' : 'nowrap',
            gap: spacing.lg,
          }}
        >
          {bots.map((bot) => (
            // flexBasis+flexGrow (not a bare flex:1) so cards wrap onto a
            // new row once there are enough of them, instead of shrinking
            // indefinitely narrower forever in one row.
            <View key={bot.id} style={{ flexBasis: isDesktop ? 340 : undefined, flexGrow: isDesktop ? 1 : undefined }}>
              <BotCard
                bot={bot}
                variant="full"
                onPress={() => router.push(`/bots/${bot.id}` as any)}
                onDelete={() => {
                  setDeleteError(null);
                  setDeleteTarget(bot);
                }}
              />
            </View>
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Eliminar bot"
        description={`Vas a eliminar "${deleteTarget?.name ?? ''}" de forma PERMANENTE. Esta acción no se puede deshacer. El historial de órdenes reales (si las hubiera) se conserva, pero deja de estar asociado a este bot.`}
        confirmLabel={isDeleting ? 'Eliminando…' : 'Eliminar'}
        destructive
        onConfirm={() => {
          if (!isDeleting) void runDelete();
        }}
        onCancel={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      />

      {deleteError ? (
        <Text variant="body" style={{ color: colors.danger, textAlign: 'center' }}>
          {deleteError}
        </Text>
      ) : null}
    </ScrollView>
  );
}
