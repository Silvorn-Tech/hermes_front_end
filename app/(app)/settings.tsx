import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../../components/common/Text';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Section } from '../../components/common/Section';
import { PreviewBanner } from '../../components/common/PreviewBanner';
import { EmptyState } from '../../components/common/EmptyState';
import { spacing } from '../../constants';
import { useAuth } from '../../hooks/AuthContext';
import { SimulationConfig } from '../../types';
import { apiClient } from '../../services/api';

/** Self-fetching, read-only: GET /config/simulation is a documented
 * operator default, not a secret, so this needs no permission check and
 * no write path — there is no way to change the default from the app. */
function TradingSafetySection() {
  const [config, setConfig] = useState<SimulationConfig | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getSimulationConfig()
      .then((result) => {
        if (!cancelled) setConfig(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
            {config ? `$${config.initialCapitalQuote.toLocaleString('en-US')} ${config.quoteAsset}` : failed ? '—' : '…'}
          </Text>
        </View>
        <Text variant="caption" color="muted">
          Todo bot nuevo se crea en modo Simulación con este capital virtual. No hay forma de activar Live
          trading todavía.
        </Text>
      </Card>
    </View>
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

      <Section title="Trading Safety">
        <TradingSafetySection />
      </Section>

      <Section title="Preferencias">
        <PreviewBanner
          variant="pending"
          label="Integración con backend pendiente"
          description="Preferencias de cuenta, notificaciones e integraciones estarán disponibles cuando el backend exponga un endpoint de configuración de usuario."
        />
      </Section>
    </ScrollView>
  );
}
