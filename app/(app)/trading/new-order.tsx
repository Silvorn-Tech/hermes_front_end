import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DetailDrawer } from '../../../components/common/DetailDrawer';
import { Text } from '../../../components/common/Text';
import { Tabs } from '../../../components/common/Tabs';
import { Button } from '../../../components/common/Button';
import { useHermesData } from '../../../hooks/HermesDataContext';
import { colors, radius, spacing } from '../../../constants';
import { generateIdempotencyKey } from '../../../services/idempotency';
import { getErrorMessage, getRejectionMessage } from '../../../services/errorMessages';
import { apiClient, MarketData } from '../../../services/api';
import { formatPercent, formatPrice } from '../../../utils/format';
import { OrderSide, OrderType } from '../../../types';

const MARKET_DATA_DEBOUNCE_MS = 500;

const sideTabs = [
  { key: 'BUY', label: 'Compra' },
  { key: 'SELL', label: 'Venta' },
];

const typeTabs = [
  { key: 'MARKET', label: 'Market' },
  { key: 'LIMIT', label: 'Limit' },
];

// A UX-only sanity check (non-empty, no thousands separators, at most one
// decimal point) — this is not the backend's validation. The RiskEngine,
// OrderValidator, and Binance's own lot-size/notional rules are the only
// real authority; whatever they reject, this screen shows verbatim.
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

function fieldStyle(invalid: boolean) {
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

export default function NewOrderScreen() {
  const router = useRouter();
  const { createOrder } = useHermesData();

  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<OrderSide>('BUY');
  const [type, setType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Regenerated only when the user starts a genuinely new order attempt
  // (after a terminal result), not on every keystroke — see
  // services/idempotency.ts for the reuse-vs-regenerate contract.
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());

  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [marketDataLoading, setMarketDataLoading] = useState(false);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);

  const trimmedSymbol = symbol.trim().toUpperCase();
  const symbolValid = trimmedSymbol.length > 0;

  // Debounced lookup — never fires on every keystroke, just once the user
  // pauses typing a symbol. Purely informational (a reference price for
  // picking a LIMIT price); the backend is still the only source of truth
  // for what an order actually executes at.
  useEffect(() => {
    setMarketData(null);
    setMarketDataError(null);
    if (!symbolValid) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setMarketDataLoading(true);
      try {
        const data = await apiClient.getMarketData(trimmedSymbol);
        if (!cancelled) setMarketData(data);
      } catch (error) {
        if (!cancelled) setMarketDataError(getErrorMessage(error));
      } finally {
        if (!cancelled) setMarketDataLoading(false);
      }
    }, MARKET_DATA_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedSymbol, symbolValid]);
  const quantityValid = DECIMAL_PATTERN.test(quantity.trim()) && Number(quantity.trim()) > 0;
  const priceValid = type === 'MARKET' || (DECIMAL_PATTERN.test(price.trim()) && Number(price.trim()) > 0);
  const formValid = symbolValid && quantityValid && priceValid;

  const errors = useMemo(() => {
    if (!touched) return null;
    if (!symbolValid) return 'Ingresá un símbolo (ej. BTCUSDT).';
    if (!quantityValid) return 'La cantidad debe ser un número decimal mayor a 0.';
    if (!priceValid) return 'El precio debe ser un número decimal mayor a 0 para órdenes Limit.';
    return null;
  }, [touched, symbolValid, quantityValid, priceValid]);

  const handleSubmit = async () => {
    setTouched(true);
    if (!formValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createOrder(
        {
          symbol: trimmedSymbol,
          side,
          type,
          quantity: quantity.trim(),
          price: type === 'LIMIT' ? price.trim() : undefined,
        },
        idempotencyKey
      );
      if (result.status === 'REJECTED' || result.status === 'FAILED') {
        setSubmitError(getRejectionMessage(result.reason));
        // A fresh attempt after a terminal rejection is a new logical
        // action, so it gets a new idempotency key.
        setIdempotencyKey(generateIdempotencyKey());
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
    <DetailDrawer title="Nueva orden" onClose={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            Símbolo
          </Text>
          <TextInput
            value={symbol}
            onChangeText={setSymbol}
            placeholder="BTCUSDT"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={fieldStyle(touched && !symbolValid)}
          />
          {marketDataLoading ? (
            <Text variant="caption" color="muted">
              Buscando precio…
            </Text>
          ) : marketDataError ? (
            <Text variant="caption" color="muted">
              No se pudo obtener el precio de mercado.
            </Text>
          ) : marketData ? (
            <Text variant="caption" color="muted">
              Último precio: {formatPrice(marketData.lastPrice)} ({formatPercent(marketData.priceChangePercent, { signed: true })} 24h)
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            Lado
          </Text>
          <Tabs items={sideTabs} activeKey={side} onChange={(k) => setSide(k as OrderSide)} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            Tipo de orden
          </Text>
          <Tabs items={typeTabs} activeKey={type} onChange={(k) => setType(k as OrderType)} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            Cantidad
          </Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={fieldStyle(touched && !quantityValid)}
          />
        </View>

        {type === 'LIMIT' ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" color="muted">
              Precio
            </Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={fieldStyle(touched && !priceValid)}
            />
          </View>
        ) : (
          <Text variant="caption" color="muted">
            Las órdenes Market se ejecutan al mejor precio disponible — sin precio a definir.
          </Text>
        )}

        <Text variant="caption" color="muted">
          Hermes es la única autoridad final: esta pantalla solo valida el formato, no límites de riesgo, tamaño de
          lote ni notional mínimo. Si el backend rechaza la orden, el motivo se muestra tal cual.
        </Text>

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
          label={isSubmitting ? 'Enviando…' : 'Crear orden'}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
          fullWidth
        />
      </ScrollView>
    </DetailDrawer>
  );
}
