import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { colors } from '../../constants';
import { RiskProfile } from '../../types';

interface Props {
  riskProfile: RiskProfile;
  size?: number;
  active?: boolean;
}

const glyphColor: Record<RiskProfile, string> = {
  SENTINEL: colors.bots.SENTINEL,
  EQUILIBRIUM: colors.bots.EQUILIBRIUM,
  VORTEX: colors.bots.VORTEX,
};

function GlyphShape({ riskProfile, size, color }: { riskProfile: RiskProfile; size: number; color: string }) {
  if (riskProfile === 'SENTINEL') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 3.5 L19 6.2 V11.3 C19 15.8 16 18.9 12 20.5 C8 18.9 5 15.8 5 11.3 V6.2 Z"
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (riskProfile === 'EQUILIBRIUM') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Line x1="12" y1="4.5" x2="12" y2="18" stroke={color} strokeWidth={1.6} />
        <Line x1="5" y1="8" x2="19" y2="8" stroke={color} strokeWidth={1.6} />
        <Circle cx="5" cy="12" r="3.2" stroke={color} strokeWidth={1.6} />
        <Circle cx="19" cy="12" r="3.2" stroke={color} strokeWidth={1.6} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 12 C12 8.7 14.7 6 18 6 C20 6 21 7.5 21 9 C21 12.3 17.5 14 14.5 14 C9.5 14 5.5 10.6 5.5 6.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="12" cy="12" r="1.3" fill={color} />
    </Svg>
  );
}

/** Abstract geometric mark per risk profile — differentiated by hue + shape, never a literal icon. */
export function BotGlyph({ riskProfile, size = 32, active }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const color = glyphColor[riskProfile];

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${color}1F`,
        transform: [{ scale: active ? pulse : 1 }],
      }}
    >
      <View>
        <GlyphShape riskProfile={riskProfile} size={size * 0.6} color={color} />
      </View>
    </Animated.View>
  );
}
