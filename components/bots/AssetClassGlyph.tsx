import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

/** UI-only — includes `TOKENIZED_EQUITY`, which has no backend
 * `AssetClass` enum value (see `types/bot.ts`). Never sent to the API;
 * only used to render the (disabled) "coming soon" card. */
export type AssetClassOption = 'CRYPTO' | 'EQUITY' | 'TOKENIZED_EQUITY';

interface Props {
  assetClass: AssetClassOption;
  size?: number;
  color: string;
}

/** Abstract geometric mark per asset class, matching BotGlyph.tsx's
 * convention (shape + hue, never a literal icon). */
function GlyphShape({ assetClass, size, color }: { assetClass: AssetClassOption; size: number; color: string }) {
  if (assetClass === 'CRYPTO') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Polygon
          points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5"
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (assetClass === 'EQUITY') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Polygon points="12,4 20,19 4,19" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3 L19 12 L12 21 L5 12 Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

export function AssetClassGlyph({ assetClass, size = 28, color }: Props) {
  return (
    <View
      style={{
        width: size + 12,
        height: size + 12,
        borderRadius: (size + 12) / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${color}1F`,
      }}
    >
      <GlyphShape assetClass={assetClass} size={size * 0.6} color={color} />
    </View>
  );
}
