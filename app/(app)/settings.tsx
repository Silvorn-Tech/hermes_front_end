import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../../components/common/Text';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { spacing } from '../../constants';
import { useAuth } from '../../hooks/AuthContext';

/** Mostly a placeholder for v1 — account/notifications/integrations are future work. Sign out lives here per the auth spec. */
export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
      <Text variant="display">Settings</Text>

      {user ? (
        <Card style={{ gap: spacing.md }}>
          <View>
            <Text variant="cardTitle">{user.name}</Text>
            <Text variant="body" color="secondary">
              {user.email}
            </Text>
          </View>
          <Button label="Cerrar sesión" variant="secondary" onPress={signOut} />
        </Card>
      ) : null}

      <Card>
        <Text variant="body" color="secondary">
          La configuración de cuenta, notificaciones e integraciones estará disponible próximamente.
        </Text>
      </Card>
    </ScrollView>
  );
}
