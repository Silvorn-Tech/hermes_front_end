import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { Text } from '../common/Text';
import { colors, spacing, BOTTOM_NAV_HEIGHT } from '../../constants';
import { mobileNavItems } from './navItems';

export function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View
      style={{
        flexDirection: 'row',
        height: BOTTOM_NAV_HEIGHT,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      {mobileNavItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.href as any)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
          >
            <Ionicons name={item.icon} size={20} color={active ? colors.textPrimary : colors.textMuted} />
            <Text variant="caption" color={active ? 'primary' : 'muted'} style={{ fontSize: 11 }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
