import React from 'react';
import { View } from 'react-native';
import { Text } from '../common/Text';
import { riskLevelColor } from './RiskState';
import { radius, spacing } from '../../constants';
import { RiskHistoryPoint } from '../../types';

interface Props {
  history: RiskHistoryPoint[];
}

export function RiskHistoryStrip({ history }: Props) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {history.map((point, i) => (
        <View key={i} style={{ alignItems: 'center', gap: spacing.xs }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: radius.full,
              backgroundColor: riskLevelColor[point.level],
            }}
          />
          <Text variant="caption" color="muted">
            {point.date}
          </Text>
        </View>
      ))}
    </View>
  );
}
