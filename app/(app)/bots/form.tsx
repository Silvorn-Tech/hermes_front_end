import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DetailDrawer } from '../../../components/common/DetailDrawer';
import { Text } from '../../../components/common/Text';
import { Button } from '../../../components/common/Button';
import { ChipSelect } from '../../../components/common/ChipSelect';
import { PreviewBanner } from '../../../components/common/PreviewBanner';
import { EmptyState } from '../../../components/common/EmptyState';
import { useHermesData } from '../../../hooks/HermesDataContext';
import { colors, radius, spacing } from '../../../constants';
import { AssetClass, ExecutionVenue, StrategyModel } from '../../../types';

const assetClassOptions: { value: AssetClass; label: string }[] = [
  { value: 'CRYPTO', label: 'Crypto' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'TOKENIZED_EQUITY', label: 'Tokenized Equity' },
];

const venueOptions: { value: ExecutionVenue; label: string }[] = [{ value: 'BINANCE', label: 'Binance' }];

const strategyOptions: { value: StrategyModel; label: string }[] = [
  { value: 'SIGNAL_BASED', label: 'Signal based' },
  { value: 'REGIME_BASED', label: 'Regime based' },
  { value: 'GARCH', label: 'GARCH' },
  { value: 'MONTE_CARLO', label: 'Monte Carlo' },
];

function fieldStyle() {
  return {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    fontSize: 15,
  };
}

export default function BotFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { bots } = useHermesData();
  const isEdit = Boolean(id);
  const existingBot = isEdit ? bots.find((b) => b.id === id) : undefined;

  // Hooks must run unconditionally on every render, so the "bot not found"
  // early return happens after all of them are declared, not before.
  const [name, setName] = useState(existingBot?.name ?? '');
  const [assetClass, setAssetClass] = useState<AssetClass>(existingBot?.assetClass ?? 'CRYPTO');
  const [executionVenue, setExecutionVenue] = useState<ExecutionVenue>(existingBot?.executionVenue ?? 'BINANCE');
  const [strategyModel, setStrategyModel] = useState<StrategyModel>(existingBot?.strategyModel ?? 'SIGNAL_BASED');
  const [exposureLimit, setExposureLimit] = useState(
    existingBot?.exposure.limitPct !== undefined ? String(existingBot.exposure.limitPct) : ''
  );
  const [submitted, setSubmitted] = useState(false);

  if (isEdit && !existingBot) {
    return (
      <DetailDrawer title="Bot" onClose={() => router.back()}>
        <EmptyState title="Bot no encontrado." />
      </DetailDrawer>
    );
  }

  return (
    <DetailDrawer title={isEdit ? 'Editar bot' : 'Nuevo bot'} onClose={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            Nombre
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre del bot"
            placeholderTextColor={colors.textMuted}
            style={fieldStyle()}
          />
        </View>

        <ChipSelect label="Asset class" options={assetClassOptions} value={assetClass} onChange={setAssetClass} />
        <ChipSelect label="Execution venue" options={venueOptions} value={executionVenue} onChange={setExecutionVenue} />
        <ChipSelect label="Strategy / Model" options={strategyOptions} value={strategyModel} onChange={setStrategyModel} />

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            Límite de exposure (%)
          </Text>
          <TextInput
            value={exposureLimit}
            onChangeText={setExposureLimit}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={fieldStyle()}
          />
        </View>

        {submitted ? (
          <PreviewBanner
            variant="pending"
            label="Integración con backend pendiente"
            description={`La ${isEdit ? 'edición' : 'creación'} de bots requiere el Bot API del backend, que todavía no existe. Nada de lo que completaste arriba se guardó.`}
          />
        ) : (
          <Text variant="caption" color="muted">
            Hermes todavía no tiene un Bot API — este formulario está preparado para cuando exista, pero no persiste
            cambios.
          </Text>
        )}

        <Button label={isEdit ? 'Guardar cambios' : 'Crear bot'} onPress={() => setSubmitted(true)} fullWidth />
      </ScrollView>
    </DetailDrawer>
  );
}
