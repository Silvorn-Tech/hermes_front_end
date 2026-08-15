import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { colors, radius, spacing, motion } from '../../constants';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FilterChip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.brand : colors.border,
        backgroundColor: active ? colors.brand : 'transparent',
      }}
    >
      <Text variant="caption" color={active ? 'primary' : 'secondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

interface FiltersProps {
  groups: FilterGroup[];
  selected: Record<string, string | null>;
  onSelect: (groupKey: string, value: string | null) => void;
}

/** Inline chip row — used on desktop / tablet widths. */
export function FilterBar({ groups, selected, onSelect }: FiltersProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.lg }}>
      {groups.map((group) => (
        <View key={group.key} style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
          <Text variant="caption" color="muted" style={{ marginRight: spacing.xs }}>
            {group.label}
          </Text>
          {group.options.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={selected[group.key] === opt.value}
              onPress={() => onSelect(group.key, selected[group.key] === opt.value ? null : opt.value)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

/** Bottom sheet variant — used on mobile widths, triggered by a "Filtros" button. */
export function FilterSheetButton({ groups, selected, onSelect }: FiltersProps) {
  const [open, setOpen] = useState(false);
  const activeCount = Object.values(selected).filter(Boolean).length;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Text variant="button" color="secondary">
          Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              marginTop: 'auto',
              backgroundColor: colors.surfaceElevated,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              padding: spacing.xl,
              gap: spacing.lg,
              maxHeight: '75%',
            }}
          >
            <Text variant="heading">Filtros</Text>
            <ScrollView>
              {groups.map((group) => (
                <View key={group.key} style={{ marginBottom: spacing.lg, gap: spacing.sm }}>
                  <Text variant="caption" color="muted">
                    {group.label}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    {group.options.map((opt) => (
                      <FilterChip
                        key={opt.value}
                        label={opt.label}
                        active={selected[group.key] === opt.value}
                        onPress={() => onSelect(group.key, selected[group.key] === opt.value ? null : opt.value)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label="Limpiar"
                variant="secondary"
                onPress={() => groups.forEach((g) => onSelect(g.key, null))}
                style={{ flex: 1 }}
              />
              <Button label="Aplicar" onPress={() => setOpen(false)} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
