import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/common/Text';
import { EmptyState } from '../../../components/common/EmptyState';
import { SkeletonCard } from '../../../components/common/LoadingSkeleton';
import { PreviewBanner } from '../../../components/common/PreviewBanner';
import { Button } from '../../../components/common/Button';
import { BotCard } from '../../../components/bots/BotCard';
import { useHermesData } from '../../../hooks/HermesDataContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { colors, spacing } from '../../../constants';

export default function BotsScreen() {
  const { status, bots, setBotLifecycleStatus } = useHermesData();
  const { isDesktop } = useResponsive();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.xxl, maxWidth: 1280, width: '100%', alignSelf: 'center' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <Text variant="display">Bots</Text>
        <Button label="Nuevo bot" onPress={() => router.push('/bots/form' as any)} />
      </View>

      <PreviewBanner variant="preview" label="Vista previa — Bot API pendiente de backend" />

      {bots.length === 0 ? (
        <EmptyState title="Activa un bot para empezar a operar." />
      ) : (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing.lg }}>
          {bots.map((bot) => (
            <View key={bot.id} style={{ flex: isDesktop ? 1 : undefined }}>
              <BotCard
                bot={bot}
                variant="full"
                onPress={() => router.push(`/bots/${bot.id}` as any)}
                onToggleStatus={() => setBotLifecycleStatus(bot.id, bot.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED')}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
