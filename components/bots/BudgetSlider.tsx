import React from 'react';
import { View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Text } from '../common/Text';
import { colors, spacing } from '../../constants';
import { formatCurrency } from '../../utils/format';

const MIN_PCT = 5;
const MAX_PCT = 100;

interface Props {
  percentage: number;
  onChange: (pct: number) => void;
  availableBudget: number;
  quoteAsset: string;
}

/** Purely a data-entry convenience over a real number (`availableBudget`,
 * the quote asset's real free balance) — nothing here is persisted as a
 * percentage. The caller derives the actual `target_quantity` sent to
 * `POST /bots` from `percentage * availableBudget / price`. */
export function BudgetSlider({ percentage, onChange, availableBudget, quoteAsset }: Props) {
  const amount = (percentage / 100) * availableBudget;

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="caption" color="muted">
        PRESUPUESTO A UTILIZAR
      </Text>
      <Text variant="body" color="secondary">
        ¿Qué porcentaje de tu presupuesto disponible quieres asignar a este bot?
      </Text>

      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          backgroundColor: colors.surface,
          padding: spacing.lg,
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text variant="display">{Math.round(percentage)}%</Text>
          <Text variant="heading" numeric>
            {formatCurrency(amount)}
          </Text>
        </View>

        <Slider
          testID="budget-slider"
          value={percentage}
          onValueChange={onChange}
          minimumValue={MIN_PCT}
          maximumValue={MAX_PCT}
          step={1}
          minimumTrackTintColor={colors.brand}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.brand}
          accessibilityLabel="Porcentaje del presupuesto disponible"
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="caption" color="muted">
            {MIN_PCT}%
          </Text>
          <Text variant="caption" color="muted">
            {MAX_PCT}%
          </Text>
        </View>
      </View>
    </View>
  );
}
