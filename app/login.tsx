import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/common/Text';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { colors, spacing } from '../constants';
import { useAuth } from '../hooks/AuthContext';

export default function LoginScreen() {
  const { status, errorMessage, isGoogleReady, signInWithGoogle, signOut } = useAuth();

  const isBusy = status === 'google_in_progress' || status === 'authorizing';
  const isUnauthorized = status === 'unauthorized';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: '100%', maxWidth: 380, alignItems: 'center', gap: spacing.xxl }}>
            <View style={{ alignItems: 'center', gap: spacing.xs }}>
              <Text variant="display" style={{ letterSpacing: 2 }}>
                HERMES
              </Text>
              <Text variant="caption" color="secondary" style={{ letterSpacing: 2 }}>
                TRADING INTELLIGENCE
              </Text>
            </View>

            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Un sistema inteligente gestiona tu portfolio con visibilidad total sobre cada decisión.
            </Text>

            <View style={{ width: '100%', gap: spacing.md }}>
              {isUnauthorized ? (
                <View
                  style={{
                    gap: spacing.sm,
                    padding: spacing.lg,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text variant="cardTitle" style={{ textAlign: 'center' }}>
                    Acceso no autorizado
                  </Text>
                  <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                    {errorMessage}
                  </Text>
                  <GoogleSignInButton label="Intentar con otra cuenta" onPress={signOut} />
                </View>
              ) : (
                <>
                  <GoogleSignInButton
                    label={
                      status === 'google_in_progress'
                        ? 'Conectando con Google…'
                        : status === 'authorizing'
                          ? 'Verificando acceso…'
                          : 'Continuar con Google'
                    }
                    onPress={signInWithGoogle}
                    loading={isBusy}
                    disabled={!isGoogleReady}
                  />
                  {errorMessage ? (
                    <Text variant="caption" style={{ color: colors.danger, textAlign: 'center' }}>
                      {errorMessage}
                    </Text>
                  ) : null}
                </>
              )}
            </View>

            <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
              Al continuar, aceptás los Términos de Servicio y la Política de Privacidad de Hermes.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
