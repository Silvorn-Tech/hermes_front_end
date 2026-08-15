import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { colors } from '../../constants';
import { EquityPoint } from '../../types';

interface Props {
  points: EquityPoint[];
  color: string;
  height?: number;
}

/** Clean, minimal line chart — no axes, gridlines or fills. The trend is the message. */
export function EquityChart({ points, color, height = 120 }: Props) {
  const [width, setWidth] = React.useState(0);
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p.v - min) / range) * height;
    return { x, y };
  });

  const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ');
  const baselineY = height - ((points[0].v - min) / range) * height;

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Line x1={0} y1={baselineY} x2={width} y2={baselineY} stroke={colors.border} strokeWidth={1} strokeDasharray="3,4" />
          <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
}
