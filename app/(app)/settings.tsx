import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../../components/common/Text';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Section } from '../../components/common/Section';
import { PreviewBanner } from '../../components/common/PreviewBanner';
import { EmptyState } from '../../components/common/EmptyState';
import { spacing } from '../../constants';
import { useAuth } from '../../hooks/AuthContext';

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

      <Section title="Trading">
        <View style={{ gap: spacing.md }}>
          <Card>
            <Text variant="body" color="secondary">
              El estado global de trading (kill switch) se controla exclusivamente desde la configuración del
              servidor (<Text variant="body" color="secondary" style={{ fontStyle: 'italic' }}>TRADING_ENABLED</Text>).
              No es editable desde el frontend.
            </Text>
          </Card>
          <PreviewBanner
            variant="pending"
            label="Integración con backend pendiente"
            description="Todavía no existe un endpoint para leer el estado del kill switch desde la app — este bloque queda preparado para cuando exista."
          />
        </View>
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
