import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { Text } from '../common/Text';
import { colors, radius, spacing, border } from '../../constants';

interface Props {
  title: string;
  /** Short qualifier shown next to/under the title (e.g. "Conservative"). */
  meta?: string;
  /** Longer explanatory line, shown below title/meta. */
  description?: string;
  icon?: React.ReactNode;
  selected: boolean;
  disabled?: boolean;
  /** e.g. "Próximamente" for an option with no real backend support yet. */
  badge?: string;
  onPress: () => void;
  style?: ViewStyle;
}

/** Shared bordered, selectable card — reused by the asset class, risk
 * profile, and strategy pickers in the "Nuevo bot" form. One shape, three
 * call sites, matching the approved prototype's shared visual language
 * instead of three hand-copies. `style` lets callers switch between the
 * compact grid layout (asset class/strategy) and the full-width row
 * layout (risk profile). */
export function OptionCard({ title, meta, description, icon, selected, disabled, badge, onPress, style }: Props) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[
        {
          flexGrow: 1,
          flexBasis: 160,
          borderWidth: selected ? border.emphasized : border.hairline,
          borderColor: selected ? colors.brand : colors.border,
          borderRadius: radius.lg,
          backgroundColor: selected ? `${colors.brand}14` : colors.surface,
          padding: spacing.lg,
          gap: spacing.xs,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: icon ? spacing.xs : 0 }}>
        <Text variant="cardTitle">{title}</Text>
        {meta ? (
          <Text variant="caption" color="muted">
            — {meta}
          </Text>
        ) : null}
      </View>
      {description ? (
        <Text variant="caption" color="muted">
          {description}
        </Text>
      ) : null}
      {badge ? (
        <Text variant="caption" color="muted" style={{ marginTop: spacing.xs }}>
          {badge}
        </Text>
      ) : null}
    </Pressable>
  );
}
