import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { Text } from '../common/Text';
import { colors, radius, spacing, SIDEBAR_WIDTH } from '../../constants';
import { primaryNavItems, settingsNavItem } from './navItems';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View
      style={{
        width: SIDEBAR_WIDTH,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        backgroundColor: colors.background,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.md,
        justifyContent: 'space-between',
      }}
    >
      <View>
        <Text variant="cardTitle" style={{ paddingHorizontal: spacing.sm, marginBottom: spacing.xl, letterSpacing: 1 }}>
          HERMES
        </Text>
        <View style={{ gap: spacing.xs }}>
          {primaryNavItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.href as any)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.sm + 2,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: active ? colors.surfaceElevated : 'transparent',
                }}
              >
                <Ionicons name={item.icon} size={18} color={active ? colors.textPrimary : colors.textMuted} />
                <Text variant="body" color={active ? 'primary' : 'muted'}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => router.push(settingsNavItem.href as any)}
        accessibilityRole="button"
        accessibilityState={{ selected: pathname.startsWith(settingsNavItem.href) }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: pathname.startsWith(settingsNavItem.href) ? colors.surfaceElevated : 'transparent',
        }}
      >
        <Ionicons name={settingsNavItem.icon} size={18} color={colors.textMuted} />
        <Text variant="body" color="muted">
          {settingsNavItem.label}
        </Text>
      </Pressable>
    </View>
  );
}
