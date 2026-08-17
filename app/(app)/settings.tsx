import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Switch, TextInput, View } from 'react-native';
import { Text } from '../../components/common/Text';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Section } from '../../components/common/Section';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { colors, radius, spacing } from '../../constants';
import { useAuth } from '../../hooks/AuthContext';
import { SimulationConfig, UserRiskLimits } from '../../types';
import { apiClient } from '../../services/api';
import { generateIdempotencyKey } from '../../services/idempotency';
import { getErrorMessage } from '../../services/errorMessages';
import { formatRelativeTime } from '../../utils/format';

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

/** Self-fetching, read-only: GET /config/simulation is a documented
 * operator default, not a secret, so this needs no permission check and
 * no write path — there is no way to change the default from the app.
 * The personal trading switch below it is a real, per-user read/write —
 * both must be on for this user's real orders (and Simulation fills) to
 * go through; see hermes_v2's kill_switch.py. */
function TradingSafetySection() {
  const [config, setConfig] = useState<SimulationConfig | null>(null);
  const [configFailed, setConfigFailed] = useState(false);

  const [switchStatus, setSwitchStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [enabled, setEnabled] = useState(true);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getSimulationConfig()
      .then((result) => {
        if (!cancelled) setConfig(result);
      })
      .catch(() => {
        if (!cancelled) setConfigFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getTradingSwitch()
      .then((result) => {
        if (cancelled) return;
        setEnabled(result.enabled);
        setSwitchStatus('loaded');
      })
      .catch(() => {
        if (!cancelled) setSwitchStatus('failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (next: boolean) => {
    setToggling(true);
    setSwitchError(null);
    const previous = enabled;
    setEnabled(next);
    try {
      const result = await apiClient.setTradingSwitch(next, idempotencyKey);
      setEnabled(result.enabled);
      setIdempotencyKey(generateIdempotencyKey());
    } catch (error) {
      setEnabled(previous);
      setSwitchError(getErrorMessage(error));
      setIdempotencyKey(generateIdempotencyKey());
    } finally {
      setToggling(false);
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <Text variant="body" color="secondary">
          El estado global de trading (kill switch) se controla exclusivamente desde la configuración del
          servidor (<Text variant="body" color="secondary" style={{ fontStyle: 'italic' }}>TRADING_ENABLED</Text>).
          No es editable desde el frontend.
        </Text>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text variant="body">Mi interruptor personal</Text>
            <Text variant="caption" color="muted">
              Pausa tus propias órdenes reales y fills de Simulación sin afectar a otros usuarios. Ambos
              interruptores (el global y este) deben estar activos para operar.
            </Text>
          </View>
          {switchStatus === 'loading' ? (
            <Text variant="caption" color="muted">…</Text>
          ) : switchStatus === 'failed' ? (
            <Text variant="caption" color="muted">—</Text>
          ) : (
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              disabled={toggling}
              trackColor={{ false: colors.border, true: colors.brand }}
            />
          )}
        </View>
        {switchError ? (
          <Text variant="caption" style={{ color: colors.danger }}>
            {switchError}
          </Text>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="body" color="muted">
            Modo por defecto para bots nuevos
          </Text>
          <Text variant="body">🧪 Simulación</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="body" color="muted">
            Capital inicial de simulación
          </Text>
          <Text variant="body" numeric>
            {config ? `$${config.initialCapitalQuote.toLocaleString('en-US')} ${config.quoteAsset}` : configFailed ? '—' : '…'}
          </Text>
        </View>
        <Text variant="caption" color="muted">
          Todo bot nuevo se crea en modo Simulación con este capital virtual. No requiere una cuenta de Binance
          conectada.
        </Text>
      </Card>
    </View>
  );
}

type BinanceStatus = 'loading' | 'not-connected' | 'connected' | 'failed';

/** Self-fetching: the first credential-input UI in this app. Never
 * receives the plaintext key/secret back — only `apiKeyLast4` (a
 * credit-card-style masked hint) is ever returned after the initial
 * submission. Hermes verifies the key against Binance itself (rejecting
 * one with withdrawals enabled) before persisting anything. */
function BinanceAccountSection() {
  const [status, setStatus] = useState<BinanceStatus>('loading');
  const [apiKeyLast4, setApiKeyLast4] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());

  const load = useCallback(() => {
    setStatus('loading');
    apiClient
      .getBinanceCredentialStatus()
      .then((result) => {
        if (result.configured) {
          setApiKeyLast4(result.apiKeyLast4);
          setVerifiedAt(result.verifiedAt);
          setStatus('connected');
        } else {
          setStatus('not-connected');
        }
      })
      .catch(() => setStatus('failed'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleConnect = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const result = await apiClient.connectBinanceCredentials({ apiKey, apiSecret }, idempotencyKey);
      if (result.connected) {
        setApiKeyLast4(result.apiKeyLast4);
        setVerifiedAt(result.verifiedAt);
        setStatus('connected');
        setApiKey('');
        setApiSecret('');
      } else {
        setConnectError(result.reason);
      }
      setIdempotencyKey(generateIdempotencyKey());
    } catch (error) {
      setConnectError(getErrorMessage(error));
      setIdempotencyKey(generateIdempotencyKey());
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiClient.disconnectBinanceCredentials(idempotencyKey);
      setApiKeyLast4(null);
      setVerifiedAt(null);
      setStatus('not-connected');
      setIdempotencyKey(generateIdempotencyKey());
    } catch (error) {
      setConnectError(getErrorMessage(error));
    } finally {
      setDisconnecting(false);
      setConfirmDisconnect(false);
    }
  };

  if (status === 'loading') {
    return (
      <Card>
        <Text variant="body" color="muted">
          Cargando…
        </Text>
      </Card>
    );
  }

  if (status === 'failed') {
    return (
      <ErrorState title="No se pudo cargar el estado de tu cuenta de Binance." onRetry={load} />
    );
  }

  if (status === 'connected') {
    return (
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text variant="body">Cuenta conectada</Text>
            <Text variant="body" color="muted" numeric>
              •••• {apiKeyLast4}
            </Text>
          </View>
        </View>
        {verifiedAt ? (
          <Text variant="caption" color="muted">Verificada {formatRelativeTime(verifiedAt)}</Text>
        ) : null}
        {connectError ? (
          <Text variant="caption" style={{ color: colors.danger }}>
            {connectError}
          </Text>
        ) : null}
        <Button
          label={disconnecting ? 'Desconectando…' : 'Desconectar'}
          variant="danger"
          disabled={disconnecting}
          onPress={() => setConfirmDisconnect(true)}
        />
        <ConfirmDialog
          visible={confirmDisconnect}
          title="¿Desconectar tu cuenta de Binance?"
          description="Dejarás de poder operar con órdenes reales hasta que vuelvas a conectar una cuenta. Tus bots en Simulación no se ven afectados."
          confirmLabel="Desconectar"
          destructive
          onConfirm={handleDisconnect}
          onCancel={() => setConfirmDisconnect(false)}
        />
      </Card>
    );
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <Text variant="body" color="secondary">
        Conectá tu propia cuenta de Binance para poder operar con órdenes reales. Tus bots en Simulación no
        requieren esto.
      </Text>
      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" color="muted">
          API Key
        </Text>
        <TextInput
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Binance API Key"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={fieldStyle()}
        />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" color="muted">
          API Secret
        </Text>
        <TextInput
          value={apiSecret}
          onChangeText={setApiSecret}
          placeholder="Binance API Secret"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={fieldStyle()}
        />
      </View>
      {connectError ? (
        <Text variant="body" style={{ color: colors.danger }}>
          {connectError}
        </Text>
      ) : null}
      <Text variant="caption" color="muted">
        La API Key debe tener las retiradas (withdrawals) deshabilitadas. Hermes la verifica contra Binance
        antes de guardarla — nunca vuelve a mostrarse después de conectarla.
      </Text>
      <Button
        label={connecting ? 'Conectando…' : 'Conectar'}
        onPress={handleConnect}
        disabled={connecting || !apiKey.trim() || !apiSecret.trim()}
      />
    </Card>
  );
}

function numberFieldToString(value: number | null): string {
  return value === null ? '' : String(value);
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : Number(trimmed);
}

/** Self-fetching. Every field empty means "not configured" — Hermes
 * treats that as fail-closed on that dimension, the same meaning an
 * unset env var already has for the platform-wide limits. Applies to
 * real orders only; Simulation bots are unaffected. */
function RiskLimitsSection() {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [maxOrderNotionalQuote, setMaxOrderNotionalQuote] = useState('');
  const [maxSymbolExposurePct, setMaxSymbolExposurePct] = useState('');
  const [maxTotalExposurePct, setMaxTotalExposurePct] = useState('');
  const [maxDailyLossPct, setMaxDailyLossPct] = useState('');
  const [maxOpenPositions, setMaxOpenPositions] = useState('');
  const [allowedSymbols, setAllowedSymbols] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());

  const applyLimits = (limits: UserRiskLimits) => {
    setMaxOrderNotionalQuote(numberFieldToString(limits.maxOrderNotionalQuote));
    setMaxSymbolExposurePct(numberFieldToString(limits.maxSymbolExposurePct));
    setMaxTotalExposurePct(numberFieldToString(limits.maxTotalExposurePct));
    setMaxDailyLossPct(numberFieldToString(limits.maxDailyLossPct));
    setMaxOpenPositions(numberFieldToString(limits.maxOpenPositions));
    setAllowedSymbols(limits.allowedSymbols?.join(', ') ?? '');
  };

  const load = useCallback(() => {
    setStatus('loading');
    apiClient
      .getUserRiskLimits()
      .then((limits) => {
        applyLimits(limits);
        setStatus('loaded');
      })
      .catch(() => setStatus('failed'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const result = await apiClient.updateUserRiskLimits(
        {
          maxOrderNotionalQuote: parseOptionalNumber(maxOrderNotionalQuote),
          maxSymbolExposurePct: parseOptionalNumber(maxSymbolExposurePct),
          maxTotalExposurePct: parseOptionalNumber(maxTotalExposurePct),
          maxDailyLossPct: parseOptionalNumber(maxDailyLossPct),
          maxOpenPositions: parseOptionalNumber(maxOpenPositions),
          allowedSymbols: allowedSymbols.trim()
            ? allowedSymbols
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : null,
        },
        idempotencyKey
      );
      applyLimits(result);
      setSaved(true);
      setIdempotencyKey(generateIdempotencyKey());
    } catch (error) {
      setSaveError(getErrorMessage(error));
      setIdempotencyKey(generateIdempotencyKey());
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <Card>
        <Text variant="body" color="muted">
          Cargando…
        </Text>
      </Card>
    );
  }

  if (status === 'failed') {
    return <ErrorState title="No se pudieron cargar tus límites de riesgo." onRetry={load} />;
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <Text variant="body" color="secondary">
        Estos límites aplican solo a órdenes reales. Un campo vacío significa "no configurado" — Hermes
        rechazará esa dimensión hasta que la configures.
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" color="muted">
          Notional máximo por orden (USDT)
        </Text>
        <TextInput
          value={maxOrderNotionalQuote}
          onChangeText={setMaxOrderNotionalQuote}
          placeholder="Ej. 5000"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={fieldStyle()}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" color="muted">
          Exposición máxima por símbolo (%)
        </Text>
        <TextInput
          value={maxSymbolExposurePct}
          onChangeText={setMaxSymbolExposurePct}
          placeholder="Ej. 25"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={fieldStyle()}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" color="muted">
          Exposición total máxima (%)
        </Text>
        <TextInput
          value={maxTotalExposurePct}
          onChangeText={setMaxTotalExposurePct}
          placeholder="Ej. 80"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={fieldStyle()}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" color="muted">
          Pérdida diaria máxima (%)
        </Text>
        <TextInput
          value={maxDailyLossPct}
          onChangeText={setMaxDailyLossPct}
          placeholder="Ej. 10"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={fieldStyle()}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" color="muted">
          Posiciones abiertas máximas
        </Text>
        <TextInput
          value={maxOpenPositions}
          onChangeText={setMaxOpenPositions}
          placeholder="Ej. 3"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={fieldStyle()}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" color="muted">
          Símbolos permitidos (separados por coma)
        </Text>
        <TextInput
          value={allowedSymbols}
          onChangeText={setAllowedSymbols}
          placeholder="Sin restricción — ej. BTCUSDT, ETHUSDT"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          style={fieldStyle()}
        />
      </View>

      {saveError ? (
        <Text variant="body" style={{ color: colors.danger }}>
          {saveError}
        </Text>
      ) : null}
      {saved ? (
        <Text variant="body" style={{ color: colors.success }}>
          Guardado.
        </Text>
      ) : null}

      <Button label={saving ? 'Guardando…' : 'Guardar'} onPress={handleSave} disabled={saving} />
    </Card>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xxl, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
      <Text variant="display">Settings</Text>

      <Section title="Cuenta">
        {user ? (
          <Card>
            <Text variant="cardTitle">{user.name}</Text>
            <Text variant="body" color="secondary">
              {user.email}
            </Text>
          </Card>
        ) : (
          <EmptyState title="No se pudo cargar la información de cuenta." />
        )}
      </Section>

      <Section title="Sesión">
        <Card>
          <Button label="Cerrar sesión" variant="secondary" onPress={signOut} />
        </Card>
      </Section>

      <Section title="Cuenta de Binance">
        <BinanceAccountSection />
      </Section>

      <Section title="Límites de riesgo">
        <RiskLimitsSection />
      </Section>

      <Section title="Trading Safety">
        <TradingSafetySection />
      </Section>
    </ScrollView>
  );
}
