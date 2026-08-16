import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { FilterChip } from './Filters';
import { spacing } from '../../constants';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Labeled single-select chip group for a small enum form field — reuses
 * FilterChip's exact visual (Filters.tsx) instead of a dropdown/select
 * primitive, since the Visual System has none. */
export function ChipSelect<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((opt) => (
          <FilterChip key={opt.value} label={opt.label} active={opt.value === value} onPress={() => onChange(opt.value)} />
        ))}
      </View>
    </View>
  );
}
