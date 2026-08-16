import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../components/common/Text';
import { Section } from '../../components/common/Section';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonCard } from '../../components/common/LoadingSkeleton';
import { ExposureBar } from '../../components/bots/ExposureBar';
import { RiskStateBadge, RiskStateRow } from '../../components/risk/RiskState';
import { RiskLimitRow } from '../../components/risk/RiskLimitRow';
import { RiskHistoryStrip } from '../../components/risk/RiskHistoryStrip';
import { SignalCard } from '../../components/signals/SignalCard';
import { useHermesData } from '../../hooks/HermesDataContext';
import { colors, bots as botColors, spacing } from '../../constants';
import { formatPercent } from '../../utils/format';

export default function RiskScreen() {
  const { status, risk, realExposure, bots, positions, signals, activityEvents } = useHermesData();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={4} />
      </ScrollView>
    );
  }

  const riskSignals = signals.filter((s) => s.source === 'risk' || s.level === 'alert' || s.level === 'action_required');
  const isQuiet = risk.level === 'normal';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.xxl, maxWidth: 900, width: '100%', alignSelf: 'center' }}
    >
      <Text variant="display">Risk</Text>

      <Section title="Exposure (datos reales)">
        <Card style={{ gap: spacing.lg }}>
          {realExposure.totalPct === null ? (
            <EmptyState
              title="Exposición aún no disponible."
              description="Se calcula a partir de posiciones y portfolio reales — vacío hasta tener balances valuables."
            />
          ) : (
            <>
              <ExposureBar pct={realExposure.totalPct} color={colors.brand} label="Exposure total" />
              <View style={{ gap: spacing.md }}>
                {realExposure.bySymbol.map((item) => (
                  <ExposureBar key={item.symbol} pct={item.pct} color={colors.brand} label={item.symbol} />
                ))}
              </View>
            </>
          )}
        </Card>
      </Section>

      <Card style={{ backgroundColor: colors.surfaceElevated }}>
        <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
          Vista previa — el resto de esta pantalla usa datos de ejemplo. El dominio de riesgo del backend (drawdown,
          límites diarios, historial) todavía está pendiente.
        </Text>
      </Card>

      <Section title="Global risk state">
        <Card
          padding="hero"
          emphasizedBorder={!isQuiet}
          borderColor={!isQuiet ? colors.risk[risk.level] : undefined}
          style={{ gap: spacing.md }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text variant="heading" style={{ flex: 1, marginRight: spacing.md }}>
              {risk.headline}
            </Text>
            <RiskStateBadge level={risk.level} />
          </View>
          {!isQuiet ? (
            <Text variant="body" color="secondary">
              {risk.description}
            </Text>
          ) : null}
          {risk.pendingAction ? (
            <Button
              label={risk.pendingAction.label}
              variant="danger"
              onPress={() => router.push('/trading')}
              style={{ marginTop: spacing.sm }}
            />
          ) : null}
        </Card>
      </Section>

      <Section title="Exposure por bot (ejemplo)">
        <Card style={{ gap: spacing.lg }}>
          <ExposureBar pct={risk.exposureTotalPct} color={colors.brand} label="Exposure total" />
          <View style={{ gap: spacing.md }}>
            {bots.map((bot) => (
              <ExposureBar
                key={bot.id}
                pct={risk.exposureByBot[bot.id]}
                limitPct={bot.exposure.limitPct}
                color={botColors[bot.id]}
                label={bot.name}
              />
            ))}
          </View>
        </Card>
      </Section>

      <Section title="Drawdown">
        <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text variant="caption" color="muted">
              Actual
            </Text>
            <Text variant="cardTitle" numeric>
              {formatPercent(risk.drawdownCurrentPct)}
            </Text>
          </View>
          <View>
            <Text variant="caption" color="muted">
              Máximo permitido
            </Text>
            <Text variant="cardTitle" numeric color="secondary">
              {formatPercent(risk.drawdownMaxPct)}
            </Text>
          </View>
        </Card>
      </Section>

      <Section title="Daily limits">
        <Card style={{ gap: spacing.lg }}>
          {risk.dailyLimits.map((limit) => (
            <RiskLimitRow key={limit.label} item={limit} />
          ))}
        </Card>
      </Section>

      <Section title="Risk by bot">
        <Card style={{ paddingVertical: spacing.xs }}>
          {bots.map((bot) => (
            <RiskStateRow key={bot.id} label={bot.name} level={risk.riskByBot[bot.id]} />
          ))}
        </Card>
      </Section>

      <Section title="Risk by position">
        {positions.length === 0 ? (
          <EmptyState title="No hay posiciones abiertas." />
        ) : (
          <Card style={{ paddingVertical: spacing.xs }}>
            {positions.map((position) => (
              <View
                key={position.id}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm }}
              >
                <Text variant="body" color="secondary">
                  {position.symbol}
                </Text>
                {position.riskLevel ? <RiskStateBadge level={position.riskLevel} /> : (
                  <Text variant="caption" color="muted">
                    Sin clasificar
                  </Text>
                )}
              </View>
            ))}
          </Card>
        )}
      </Section>

      <Section title="Concentration">
        <Card style={{ gap: spacing.md }}>
          {risk.concentration.map((item) => (
            <View key={item.symbol} style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body" color="secondary">
                  {item.symbol}
                </Text>
                <Text variant="body" numeric color="secondary">
                  {formatPercent(item.pct, { decimals: 0 })}
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: colors.surfaceElevated, overflow: 'hidden' }}>
                <View style={{ width: `${item.pct}%`, height: '100%', backgroundColor: colors.textMuted, borderRadius: 999 }} />
              </View>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Risk history">
        <Card>
          <RiskHistoryStrip history={risk.history} />
        </Card>
      </Section>

      <Section title="Risk signals">
        {riskSignals.length === 0 ? (
          <EmptyState title="Hermes aún no tiene nada que interpretar." />
        ) : (
          <View style={{ gap: spacing.md }}>
            {riskSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                relatedEvents={activityEvents.filter((e) => signal.relatedEventIds.includes(e.id))}
              />
            ))}
          </View>
        )}
      </Section>
    </ScrollView>
  );
}
