import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DetailDrawer } from '../../../components/common/DetailDrawer';
import { Text } from '../../../components/common/Text';
import { Button } from '../../../components/common/Button';
import { ChipSelect } from '../../../components/common/ChipSelect';
import { EmptyState } from '../../../components/common/EmptyState';
import { BotGlyph } from '../../../components/bots/BotGlyph';
import { AssetClassGlyph, AssetClassOption } from '../../../components/bots/AssetClassGlyph';
import { OptionCard } from '../../../components/bots/OptionCard';
import { BudgetSlider } from '../../../components/bots/BudgetSlider';
import { InstrumentPicker } from '../../../components/bots/InstrumentPicker';
import { useHermesData } from '../../../hooks/HermesDataContext';
import { colors, radius, spacing } from '../../../constants';
import { generateIdempotencyKey } from '../../../services/idempotency';
import { getErrorMessage, getRejectionMessage } from '../../../services/errorMessages';
import { apiClient } from '../../../services/api';
import { formatCurrency } from '../../../utils/format';
import { AssetClass, ExecutionVenue, RiskProfile, StrategyModel } from '../../../types';

const MARKET_DATA_DEBOUNCE_MS = 500;
const DEFAULT_BUDGET_PCT = 20;
const EXECUTION_VENUE: ExecutionVenue = 'BINANCE';
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

const riskProfileOptions: { value: RiskProfile; label: string; meta: string; description: string }[] = [
  {
    value: 'SENTINEL',
    label: 'Sentinel',
    meta: 'Conservative',
    description: 'Prioriza protección del capital y menor exposición.',
  },
  {
    value: 'EQUILIBRIUM',
    label: 'Equilibrium',
    meta: 'Balanced',
    description: 'Equilibra exposición y oportunidad.',
  },
  {
    value: 'VORTEX',
    label: 'Vortex',
    meta: 'Aggressive',
    description: 'Tolera mayor volatilidad y exposición.',
  },
];

// TOKENIZED_EQUITY has no backend AssetClass value — kept visible per the
// approved prototype but permanently disabled, never selectable/sendable.
const assetClassOptions: {
  value: AssetClassOption;
  label: string;
  description: string;
  disabled?: boolean;
  badge?: string;
}[] = [
  { value: 'CRYPTO', label: 'Crypto', description: 'BTC, ETH, SOL...' },
  { value: 'EQUITY', label: 'Acciones', description: 'AAPL, MSFT, NVDA...' },
  {
    value: 'TOKENIZED_EQUITY',
    label: 'Tokenized Equity',
    description: 'Acciones tokenizadas',
    disabled: true,
    badge: 'Próximamente',
  },
];

// Only strategies with a real, non-fabricated meaning are offered at
// creation — GARCH/Monte Carlo stay off this list (see the edit path's
// own picker below, unchanged, for the pre-existing broader set).
const strategyOptions: { value: StrategyModel; label: string; description: string }[] = [
  { value: 'SIGNAL_BASED', label: 'Signal Based', description: 'Decisiones basadas en señales de mercado.' },
  { value: 'REGIME_BASED', label: 'Regime Based', description: 'Adapta el comportamiento al régimen del mercado.' },
];

const editRiskProfileOptions: { value: RiskProfile; label: string }[] = [
  { value: 'SENTINEL', label: 'Sentinel · Conservative' },
  { value: 'EQUILIBRIUM', label: 'Equilibrium · Balanced' },
  { value: 'VORTEX', label: 'Vortex · Aggressive' },
];

const editStrategyOptions: { value: StrategyModel; label: string }[] = [
  { value: 'SIGNAL_BASED', label: 'Signal based' },
  { value: 'REGIME_BASED', label: 'Regime based' },
  { value: 'GARCH', label: 'GARCH' },
  { value: 'MONTE_CARLO', label: 'Monte Carlo' },
];

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

/** `pct` of `availableBudget` (both real numbers), converted to an
 * instrument quantity at `price` — a data-entry convenience, never a
 * value that's itself persisted (see BudgetSlider's own docstring). */
function computeQuantityFromBudget(pct: number, availableBudget: number, price: number): number {
  return (pct / 100) * availableBudget / price;
}

function formatQuantityForSubmit(qty: number): string {
  if (!Number.isFinite(qty) || qty <= 0) return '';
  return qty.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="body" color="muted">
        {label}
      </Text>
      <Text variant="body" style={{ fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
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
  const [assetClassOption, setAssetClassOption] = useState<AssetClassOption>(
    (existingBot?.assetClass as AssetClassOption) ?? 'CRYPTO'
  );
  const [instrument, setInstrument] = useState(existingBot?.instrument ?? '');
  const [strategyModel, setStrategyModel] = useState<StrategyModel>(
    (existingBot?.strategyModel as StrategyModel) ?? 'SIGNAL_BASED'
  );
  const [targetQuantity, setTargetQuantity] = useState(existingBot ? String(existingBot.targetQuantity) : '');
  const [budgetPct, setBudgetPct] = useState(DEFAULT_BUDGET_PCT);
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());

  // Every bot this form creates is SIMULATION (see the "Modo de ejecución"
  // section below) — the budget slider's available budget is therefore the
  // bot's own virtual starting capital, not the real account's free
  // balance. Read once from the backend (GET /config/simulation) instead
  // of hardcoding the $10,000 default here, so this stays correct if
  // HERMES_SIMULATION_INITIAL_CAPITAL_USD is ever reconfigured.
  const [simulationCapital, setSimulationCapital] = useState<number | null>(null);
  const [simulationQuoteAsset, setSimulationQuoteAsset] = useState('USDT');

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const config = await apiClient.getSimulationConfig();
        if (!cancelled) {
          setSimulationCapital(config.initialCapitalQuote);
          setSimulationQuoteAsset(config.quoteAsset);
        }
      } catch {
        // No fabricated fallback number — the direct-quantity-input path
        // below covers "the budget couldn't be determined" already.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  const trimmedInstrument = instrument.trim().toUpperCase();
  const nameValid = name.trim().length > 0;
  const instrumentValid = trimmedInstrument.length > 0;

  const quoteAsset = simulationQuoteAsset;
  const availableBudget = simulationCapital;

  // Live calculator only for Crypto (the only asset class with a real
  // price feed today — GET /market-data is a Binance passthrough) and
  // only once the simulation account's starting capital is known.
  const useLiveBudgetCalculator = !isEdit && assetClassOption === 'CRYPTO' && availableBudget !== null;

  useEffect(() => {
    setMarketPrice(null);
    setPriceError(null);
    if (!useLiveBudgetCalculator || !instrumentValid) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setPriceLoading(true);
      try {
        const data = await apiClient.getMarketData(trimmedInstrument);
        if (!cancelled) setMarketPrice(data.lastPrice);
      } catch (error) {
        if (!cancelled) setPriceError(getErrorMessage(error));
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    }, MARKET_DATA_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedInstrument, instrumentValid, useLiveBudgetCalculator]);

  const computedQuantity =
    useLiveBudgetCalculator && marketPrice
      ? computeQuantityFromBudget(budgetPct, availableBudget as number, marketPrice)
      : null;
  const computedQuantityStr = computedQuantity !== null ? formatQuantityForSubmit(computedQuantity) : '';

  const finalQuantityStr = useLiveBudgetCalculator ? computedQuantityStr : targetQuantity.trim();
  const quantityValid = DECIMAL_PATTERN.test(finalQuantityStr) && Number(finalQuantityStr) > 0;

  const formValid = nameValid && instrumentValid && quantityValid;

  const baseAssetLabel =
    assetClassOption === 'CRYPTO' && trimmedInstrument.endsWith(quoteAsset) && trimmedInstrument.length > quoteAsset.length
      ? trimmedInstrument.slice(0, -quoteAsset.length)
      : trimmedInstrument;

  const errors = useMemo(() => {
    if (!touched) return null;
    if (!nameValid) return 'Ingresá un nombre para el bot.';
    if (!instrumentValid) return 'Ingresá un instrumento (ej. BTCUSDT).';
    if (!quantityValid) {
      return useLiveBudgetCalculator
        ? 'No se pudo calcular una cantidad válida. Verificá el instrumento y el presupuesto.'
        : 'La cantidad objetivo debe ser un número decimal mayor a 0.';
    }
    return null;
  }, [touched, nameValid, instrumentValid, quantityValid, useLiveBudgetCalculator]);

  const handleAssetClassChange = (value: AssetClassOption) => {
    if (value === assetClassOption) return;
    setAssetClassOption(value);
    setInstrument('');
    setTargetQuantity('');
    setBudgetPct(DEFAULT_BUDGET_PCT);
    setMarketPrice(null);
    setPriceError(null);
  };

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
          { name: name.trim(), targetQuantity: targetQuantity.trim(), strategyModel },
          idempotencyKey
        );
        router.back();
      } else {
        const result = await createBot(
          {
            name: name.trim(),
            riskProfile,
            assetClass: assetClassOption as AssetClass,
            executionVenue: EXECUTION_VENUE,
            instrument: trimmedInstrument,
            targetQuantity: finalQuantityStr,
            strategyModel,
          },
          idempotencyKey
        );
        // Never assume success from a resolved promise alone — only a
        // real bot back from the backend, in the state it says it's in.
        if (result.bot && result.bot.status === 'PAUSED') {
          router.back();
        } else {
          setSubmitError(getRejectionMessage(result.reason));
          setIdempotencyKey(generateIdempotencyKey());
        }
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error));
      // A fresh attempt after a failure is a new logical action.
      setIdempotencyKey(generateIdempotencyKey());
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEdit) {
    return (
      <DetailDrawer title="Editar bot" onClose={() => router.back()}>
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

          <ChipSelect label="Risk profile" options={editRiskProfileOptions} value={riskProfile} onChange={setRiskProfile} />

          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" color="muted">
              Asset class · Execution venue · Instrument
            </Text>
            <Text variant="body" color="secondary">
              {existingBot?.assetClass} · {existingBot?.executionVenue} · {existingBot?.instrument}
            </Text>
            <Text variant="caption" color="muted">
              No editables después de creado el bot.
            </Text>
          </View>

          <ChipSelect label="Strategy / Model" options={editStrategyOptions} value={strategyModel} onChange={setStrategyModel} />

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
            label={isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            onPress={() => void handleSubmit()}
            disabled={isSubmitting}
            fullWidth
          />
        </ScrollView>
      </DetailDrawer>
    );
  }

  const assetClassLabel = assetClassOptions.find((o) => o.value === assetClassOption)?.label ?? assetClassOption;
  const riskProfileLabel = riskProfileOptions.find((o) => o.value === riskProfile)?.label ?? riskProfile;
  const strategyLabel = strategyOptions.find((o) => o.value === strategyModel)?.label ?? strategyModel;

  return (
    <DetailDrawer title="Nuevo bot" onClose={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <Text variant="body" color="muted">
          Configura cómo Hermes gestionará tu estrategia.
        </Text>

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            NOMBRE DEL BOT
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Mi estrategia BTC"
            placeholderTextColor={colors.textMuted}
            style={fieldStyle(touched && !nameValid)}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            ¿QUÉ QUIERES OPERAR?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {assetClassOptions.map((opt) => (
              <OptionCard
                key={opt.value}
                title={opt.label}
                description={opt.description}
                icon={
                  <AssetClassGlyph
                    assetClass={opt.value}
                    color={assetClassOption === opt.value ? colors.brand : colors.textSecondary}
                  />
                }
                selected={assetClassOption === opt.value}
                disabled={opt.disabled}
                badge={opt.badge}
                onPress={() => handleAssetClassChange(opt.value)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            PERFIL DE RIESGO
          </Text>
          <View style={{ gap: spacing.md }}>
            {riskProfileOptions.map((opt) => (
              <OptionCard
                key={opt.value}
                title={opt.label}
                meta={opt.meta}
                description={opt.description}
                icon={<BotGlyph riskProfile={opt.value} size={28} />}
                selected={riskProfile === opt.value}
                onPress={() => setRiskProfile(opt.value)}
                style={{ flexGrow: 0, flexBasis: 'auto', width: '100%' }}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            ESTRATEGIA / MODELO
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {strategyOptions.map((opt) => (
              <OptionCard
                key={opt.value}
                title={opt.label}
                description={opt.description}
                selected={strategyModel === opt.value}
                onPress={() => setStrategyModel(opt.value)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            INSTRUMENTO
          </Text>
          <Text variant="body" color="secondary">
            ¿Qué activo quieres operar?
          </Text>
          <InstrumentPicker
            assetClass={assetClassOption === 'EQUITY' ? 'EQUITY' : 'CRYPTO'}
            value={instrument}
            onChange={setInstrument}
            placeholder={assetClassOption === 'EQUITY' ? 'AAPLBUSDT' : 'BTCUSDT'}
            invalid={touched && !instrumentValid}
          />
          <Text variant="caption" color="muted">
            Binance
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            MODO DE EJECUCIÓN
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            <OptionCard
              title="🧪 Simulación"
              description="Opera con dinero virtual y precios de mercado reales. Ninguna orden llega a Binance."
              selected
              onPress={() => {}}
            />
            <OptionCard
              title="🔴 Live"
              description="Operar con dinero real."
              badge="La activación de Live estará disponible en una próxima versión."
              selected={false}
              disabled
              onPress={() => {}}
            />
          </View>
          <Text variant="caption" color="muted">
            Todo bot nuevo se crea en modo Simulación. No hay forma de crear un bot Live todavía.
          </Text>
        </View>

        {useLiveBudgetCalculator ? (
          <View style={{ gap: spacing.sm }}>
            <BudgetSlider
              percentage={budgetPct}
              onChange={setBudgetPct}
              availableBudget={availableBudget as number}
              quoteAsset={quoteAsset}
            />
            <Text variant="caption" color="muted">
              Presupuesto virtual de simulación — no es dinero real.
            </Text>
            {!instrumentValid ? (
              <Text variant="caption" color="muted">
                Ingresá un instrumento para calcular la cantidad.
              </Text>
            ) : priceLoading ? (
              <Text variant="caption" color="muted">
                Calculando cantidad…
              </Text>
            ) : priceError ? (
              <Text variant="caption" style={{ color: colors.danger }}>
                No se pudo obtener el precio de mercado para este instrumento.
              </Text>
            ) : computedQuantityStr ? (
              <Text variant="caption" color="muted">
                ≈ {computedQuantityStr} {baseAssetLabel}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" color="muted">
              CANTIDAD OBJETIVO
            </Text>
            <Text variant="caption" color="muted">
              {assetClassOption === 'EQUITY'
                ? 'Hermes todavía no tiene un feed de precios en vivo para acciones — ingresá la cantidad directamente.'
                : 'No se pudo determinar el capital inicial de simulación — ingresá la cantidad directamente.'}
            </Text>
            <TextInput
              value={targetQuantity}
              onChangeText={setTargetQuantity}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={fieldStyle(touched && !quantityValid)}
            />
          </View>
        )}

        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
            padding: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <Text variant="caption" color="muted">
            RESUMEN
          </Text>
          <SummaryRow label="Modo de ejecución" value="🧪 Simulación" />
          <SummaryRow label="Activo" value={assetClassLabel} />
          <SummaryRow label="Riesgo" value={riskProfileLabel} />
          <SummaryRow label="Estrategia" value={strategyLabel} />
          <SummaryRow label="Instrumento" value={trimmedInstrument || '—'} />
          {useLiveBudgetCalculator ? (
            <SummaryRow
              label="Presupuesto"
              value={`${Math.round(budgetPct)}% · ${formatCurrency((budgetPct / 100) * (availableBudget as number))}`}
            />
          ) : null}
          <SummaryRow label="Cantidad" value={finalQuantityStr ? `${finalQuantityStr} ${baseAssetLabel}` : '—'} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />
          <SummaryRow label="Estado inicial" value="PAUSED" />
          <Text variant="caption" color="muted">
            Hermes no ejecutará operaciones hasta que reanudes el bot.
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
          label={isSubmitting ? 'Creando…' : 'Crear bot'}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
          fullWidth
        />
      </ScrollView>
    </DetailDrawer>
  );
}
