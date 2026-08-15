import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../../components/common/Text';
import { Card } from '../../components/common/Card';
import { spacing } from '../../constants';

/** Out of scope for v1 — placeholder landing spot referenced by the sidebar's Settings entry. */
export default function SettingsScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
      <Text variant="display">Settings</Text>
      <Card>
        <Text variant="body" color="secondary">
          La configuración de cuenta, notificaciones e integraciones estará disponible próximamente.
        </Text>
      </Card>
    </ScrollView>
  );
}
