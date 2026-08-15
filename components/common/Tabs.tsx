import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing, motion } from '../../constants';

export interface TabItem {
  key: string;
  label: string;
}

interface Props {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function Tabs({ items, activeKey, onChange }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 3,
        alignSelf: 'flex-start',
      }}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              paddingVertical: spacing.xs + 2,
              paddingHorizontal: spacing.lg,
              borderRadius: radius.sm,
              backgroundColor: active ? colors.surfaceElevated : 'transparent',
            }}
          >
            <Text variant="button" color={active ? 'primary' : 'muted'}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
