import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DetailDrawer } from '../../../components/common/DetailDrawer';
import { Text } from '../../../components/common/Text';
import { Button } from '../../../components/common/Button';
import { ChipSelect } from '../../../components/common/ChipSelect';
import { EmptyState } from '../../../components/common/EmptyState';
import { useHermesData } from '../../../hooks/HermesDataContext';
import { colors, radius, spacing } from '../../../constants';
import { generateIdempotencyKey } from '../../../services/idempotency';
import { getErrorMessage } from '../../../services/errorMessages';
import { AssetClass, ExecutionVenue, RiskProfile, StrategyModel } from '../../../types';

const riskProfileOptions: { value: RiskProfile; label: string }[] = [
  { value: 'SENTINEL', label: 'Sentinel · Conservative' },
  { value: 'EQUILIBRIUM', label: 'Equilibrium · Balanced' },
  { value: 'VORTEX', label: 'Vortex · Aggressive' },
];

const assetClassOptions: { value: AssetClass; label: string }[] = [
  { value: 'CRYPTO', label: 'Crypto' },
  { value: 'EQUITY', label: 'Equity' },
];

const venueOptions: { value: ExecutionVenue; label: string }[] = [{ value: 'BINANCE', label: 'Binance' }];

// The backend stores strategy_model as a free string, not an enum — this
// curated list is only the form's picker; no option here is asset-class-
// restricted, since crypto isn't always signal-based and stocks aren't
// always GARCH.
const strategyOptions: { value: StrategyModel; label: string }[] = [
  { value: 'SIGNAL_BASED', label: 'Signal based' },
  { value: 'REGIME_BASED', label: 'Regime based' },
  { value: 'GARCH', label: 'GARCH' },
  { value: 'MONTE_CARLO', label: 'Monte Carlo' },
];

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

function fieldStyle(invalid = false) {
  return {
    borderWidth: 1,
    borderColor: invalid ? colors.danger : colors.border,
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
  const { bots, createBot, updateBot } = useHermesData();
  const isEdit = Boolean(id);
  const existingBot = isEdit ? bots.find((b) => b.id === id) : undefined;

  // Hooks must run unconditionally on every render, so the "bot not found"
  // early return happens after all of them are declared, not before.
  const [name, setName] = useState(existingBot?.name ?? '');
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(existingBot?.riskProfile ?? 'SENTINEL');
  const [assetClass, setAssetClass] = useState<AssetClass>(existingBot?.assetClass ?? 'CRYPTO');
  const [executionVenue, setExecutionVenue] = useState<ExecutionVenue>(existingBot?.executionVenue ?? 'BINANCE');
  const [instrument, setInstrument] = useState(existingBot?.instrument ?? '');
  const [strategyModel, setStrategyModel] = useState<StrategyModel>(
    (existingBot?.strategyModel as StrategyModel) ?? 'SIGNAL_BASED'
  );
  const [targetQuantity, setTargetQuantity] = useState(
    existingBot ? String(existingBot.targetQuantity) : ''
  );
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());

  const trimmedInstrument = instrument.trim().toUpperCase();
  const nameValid = name.trim().length > 0;
  const instrumentValid = trimmedInstrument.length > 0;
  const quantityValid = DECIMAL_PATTERN.test(targetQuantity.trim()) && Number(targetQuantity.trim()) > 0;
  const formValid = nameValid && instrumentValid && quantityValid;

  const errors = useMemo(() => {
    if (!touched) return null;
    if (!nameValid) return 'Ingresá un nombre para el bot.';
    if (!instrumentValid) return 'Ingresá un instrumento (ej. BTCUSDT).';
    if (!quantityValid) return 'La cantidad objetivo debe ser un número decimal mayor a 0.';
    return null;
  }, [touched, nameValid, instrumentValid, quantityValid]);

  if (isEdit && !existingBot) {
    return (
      <DetailDrawer title="Bot" onClose={() => router.back()}>
        <EmptyState title="Bot no encontrado." />
      </DetailDrawer>
    );
  }

  const handleSubmit = async () => {
    setTouched(true);
    if (!formValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (isEdit && existingBot) {
        await updateBot(
          existingBot.id,
          {
            name: name.trim(),
            targetQuantity: targetQuantity.trim(),
            strategyModel,
          },
          idempotencyKey
        );
      } else {
        await createBot(
          {
            name: name.trim(),
            riskProfile,
            assetClass,
            executionVenue,
            instrument: trimmedInstrument,
            targetQuantity: targetQuantity.trim(),
            strategyModel,
          },
          idempotencyKey
        );
      }
      router.back();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
      // A fresh attempt after a failure is a new logical action.
      setIdempotencyKey(generateIdempotencyKey());
    } finally {
      setIsSubmitting(false);
    }
  };

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
            style={fieldStyle(touched && !nameValid)}
          />
        </View>

        <ChipSelect label="Risk profile" options={riskProfileOptions} value={riskProfile} onChange={setRiskProfile} />

        {isEdit ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" color="muted">
              Asset class · Execution venue · Instrument
            </Text>
            <Text variant="body" color="secondary">
              {assetClass} · {executionVenue} · {instrument}
            </Text>
            <Text variant="caption" color="muted">
              No editables después de creado el bot.
            </Text>
          </View>
        ) : (
          <>
            <ChipSelect label="Asset class" options={assetClassOptions} value={assetClass} onChange={setAssetClass} />
            <ChipSelect label="Execution venue" options={venueOptions} value={executionVenue} onChange={setExecutionVenue} />
            <View style={{ gap: spacing.sm }}>
              <Text variant="caption" color="muted">
                Instrument
              </Text>
              <TextInput
                value={instrument}
                onChangeText={setInstrument}
                placeholder="BTCUSDT"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                style={fieldStyle(touched && !instrumentValid)}
              />
            </View>
          </>
        )}

        <ChipSelect label="Strategy / Model" options={strategyOptions} value={strategyModel} onChange={setStrategyModel} />

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            Cantidad objetivo
          </Text>
          <TextInput
            value={targetQuantity}
            onChangeText={setTargetQuantity}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={fieldStyle(touched && !quantityValid)}
          />
          <Text variant="caption" color="muted">
            La cantidad que el bot buscará mantener cuando esté activo. No se ejecuta ninguna orden al crear o editar
            — solo al hacer Resume.
          </Text>
        </View>

        {errors ? (
          <Text variant="body" style={{ color: colors.danger }}>
            {errors}
          </Text>
        ) : null}

        {submitError ? (
          <Text variant="body" style={{ color: colors.danger }}>
            {submitError}
          </Text>
        ) : null}

        <Button
          label={isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear bot'}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
          fullWidth
        />
      </ScrollView>
    </DetailDrawer>
  );
}
