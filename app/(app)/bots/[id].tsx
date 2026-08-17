import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DetailDrawer } from '../../../components/common/DetailDrawer';
import { Text } from '../../../components/common/Text';
import { Section } from '../../../components/common/Section';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { SimulationPanel } from '../../../components/bots/SimulationPanel';
import { useHermesData } from '../../../hooks/HermesDataContext';
import { colors, spacing } from '../../../constants';
import { generateIdempotencyKey } from '../../../services/idempotency';
import { getErrorMessage, getRejectionMessage } from '../../../services/errorMessages';

const statusLabel = {
  ACTIVE: 'Activo',
  PAUSING: 'Pausando…',
  PAUSED: 'Pausado',
  RESUMING: 'Reanudando…',
  STOPPED: 'Detenido',
  ERROR: 'Error',
} as const;
const statusTone = {
  ACTIVE: colors.success,
  PAUSING: colors.warning,
  PAUSED: colors.textMuted,
  RESUMING: colors.warning,
  STOPPED: colors.textMuted,
  ERROR: colors.danger,
} as const;
const assetClassLabel = { CRYPTO: 'Crypto', EQUITY: 'Equity' } as const;
const venueLabel = { BINANCE: 'Binance' } as const;
// Text-and-emoji, never color-only -- see BotCard.tsx's own executionModeLabel.
const executionModeLabel = { SIMULATION: '🧪 Simulación', LIVE: '🔴 Live' } as const;

type Action = 'pause' | 'resume' | 'stop';

export default function BotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bots, pauseBot, resumeBot, stopBot } = useHermesData();

  const [confirmAction, setConfirmAction] = useState<Action | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // One key per action, held for the screen's lifetime — a retry of the
  // same confirm dialog reuses it; see services/idempotency.ts.
  const [pauseKey, setPauseKey] = useState(() => generateIdempotencyKey());
  const [resumeKey, setResumeKey] = useState(() => generateIdempotencyKey());
  const [stopKey, setStopKey] = useState(() => generateIdempotencyKey());

  const bot = bots.find((b) => b.id === id);

  if (!bot) {
    return (
      <DetailDrawer title="Bot" onClose={() => router.back()}>
        <EmptyState title="Bot no encontrado." />
      </DetailDrawer>
    );
  }

  const isLive = bot.status === 'ACTIVE' || bot.status === 'PAUSED';
  const canEdit = bot.status === 'PAUSED';
  const canStop = bot.status === 'ACTIVE' || bot.status === 'PAUSED' || bot.status === 'ERROR';

  const runAction = async (action: Action) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let result;
      if (action === 'pause') {
        result = await pauseBot(bot.id, pauseKey);
      } else if (action === 'resume') {
        result = await resumeBot(bot.id, resumeKey);
      } else {
        result = await stopBot(bot.id, stopKey);
      }

      if (result.status === 'REJECTED') {
        setSubmitError(getRejectionMessage(result.reason));
      } else if (result.status === 'ERROR') {
        setSubmitError(
          `${getRejectionMessage(result.reason)} El estado del bot requiere revisión manual — solo se permite Detener desde aquí.`
        );
      } else {
        setConfirmAction(null);
        // A fresh attempt (if the user triggers this action again later)
        // is a new logical action, so it gets a new key.
        if (action === 'pause') setPauseKey(generateIdempotencyKey());
        if (action === 'resume') setResumeKey(generateIdempotencyKey());
        if (action === 'stop') setStopKey(generateIdempotencyKey());
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmLabelFor = (action: Action) => {
    if (!isSubmitting) {
      return action === 'pause' ? 'Pause Bot' : action === 'resume' ? 'Resume Bot' : 'Detener';
    }
    return action === 'pause' ? 'Closing position…' : action === 'resume' ? 'Opening position…' : 'Deteniendo…';
  };

  return (
    <DetailDrawer title={bot.name} onClose={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xxl }}>
        <Section title="Header">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="heading">{bot.name}</Text>
              <Text variant="body" color="muted">
                {bot.riskProfile}
              </Text>
            </View>
            <Badge label={statusLabel[bot.status]} tone={statusTone[bot.status]} />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {isLive ? (
              <Button
                label={bot.status === 'PAUSED' ? 'Resume Bot' : 'Pause Bot'}
                variant="secondary"
                onPress={() => setConfirmAction(bot.status === 'PAUSED' ? 'resume' : 'pause')}
                style={{ flex: 1 }}
              />
            ) : null}
            {canEdit ? (
              <Button
                label="Editar"
                variant="secondary"
                onPress={() => router.push(`/bots/form?id=${bot.id}` as any)}
                style={{ flex: 1 }}
              />
            ) : null}
          </View>

          {canStop ? (
            <Button label="Detener" variant="danger" onPress={() => setConfirmAction('stop')} fullWidth />
          ) : null}

          {submitError ? (
            <Text variant="body" style={{ color: colors.danger }}>
              {submitError}
            </Text>
          ) : null}
        </Section>

        <Section title="Configuración">
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="muted">
                Modo de ejecución
              </Text>
              <Text variant="body">{executionModeLabel[bot.executionMode]}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="muted">
                Asset class
              </Text>
              <Text variant="body">{assetClassLabel[bot.assetClass]}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="muted">
                Execution venue
              </Text>
              <Text variant="body">{venueLabel[bot.executionVenue]}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="muted">
                Instrument
              </Text>
              <Text variant="body">{bot.instrument}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="muted">
                Strategy / Model
              </Text>
              <Text variant="body">{bot.strategyModel ?? 'Sin definir'}</Text>
            </View>
          </Card>
        </Section>

        {bot.executionMode === 'SIMULATION' ? (
          <Section title="Portfolio simulado">
            <SimulationPanel botId={bot.id} />
          </Section>
        ) : null}

        <Section title="Live trading">
          <Card style={{ gap: spacing.sm }}>
            <Text variant="body" color="secondary">
              Este bot opera en modo Simulación con dinero virtual. La activación de trading en vivo (dinero real)
              estará disponible en una próxima versión.
            </Text>
            {/* disabled=true makes Pressable's onPress unreachable — this
                never calls anything, exactly like the copy above says. */}
            <Button label="Activar LIVE" variant="secondary" onPress={() => {}} disabled fullWidth />
          </Card>
        </Section>

        <Section title="Exposure">
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="muted">
                Cantidad actual
              </Text>
              <Text variant="body" numeric>
                {bot.currentQuantity} {bot.instrument}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="muted">
                Cantidad objetivo
              </Text>
              <Text variant="body" numeric color="secondary">
                {bot.targetQuantity} {bot.instrument}
              </Text>
            </View>
            {bot.pausedAt ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body" color="muted">
                  Pausado desde
                </Text>
                <Text variant="body" color="secondary">
                  {new Date(bot.pausedAt).toLocaleString()}
                </Text>
              </View>
            ) : null}
          </Card>
        </Section>
      </ScrollView>

      <ConfirmDialog
        visible={confirmAction === 'pause'}
        title="Pause Bot"
        description="Pausing this bot will close its current position. The bot will save its current target exposure and can restore it when resumed."
        confirmLabel={confirmLabelFor('pause')}
        destructive
        onConfirm={() => {
          if (!isSubmitting) void runAction('pause');
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        visible={confirmAction === 'resume'}
        title="Resume Bot"
        description="Resuming this bot will open a new position using the target exposure saved when the bot was paused."
        confirmLabel={confirmLabelFor('resume')}
        onConfirm={() => {
          if (!isSubmitting) void runAction('resume');
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        visible={confirmAction === 'stop'}
        title="Detener bot"
        description={`Vas a detener ${bot.name} de forma PERMANENTE. Un bot detenido no puede reanudarse. Si tiene una posición abierta, seguirá abierta — deberás cerrarla manualmente desde Trading.`}
        confirmLabel={confirmLabelFor('stop')}
        destructive
        onConfirm={() => {
          if (!isSubmitting) void runAction('stop');
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </DetailDrawer>
  );
}
