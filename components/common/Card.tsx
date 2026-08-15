import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import { colors, radius, cardPadding, border } from '../../constants';

interface Props extends ViewProps {
  variant?: 'default' | 'elevated';
  padding?: 'default' | 'hero' | 'none';
  emphasizedBorder?: boolean;
  borderColor?: string;
  style?: ViewStyle | ViewStyle[];
}

export function Card({
  variant = 'default',
  padding = 'default',
  emphasizedBorder,
  borderColor,
  style,
  children,
  ...rest
}: Props) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: variant === 'elevated' ? colors.surfaceElevated : colors.surface,
          borderRadius: radius.lg,
          borderWidth: emphasizedBorder ? border.emphasized : border.hairline,
          borderColor: borderColor ?? colors.border,
          padding: padding === 'none' ? 0 : padding === 'hero' ? cardPadding.hero : cardPadding.default,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
