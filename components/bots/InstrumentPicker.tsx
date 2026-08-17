import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from '../common/Text';
import { colors, radius, spacing } from '../../constants';

/** A small, curated, hardcoded suggestion list per asset class — NOT a
 * live search against Binance or any broker. Hermes has no
 * `GET /instruments`-type endpoint, and `execution_venue` is Binance-only
 * today (see `hermes_v2`'s `ExecutionVenue`) — there is no separate equity
 * broker. "Equity" instruments here are Binance's own tokenized-stock spot
 * pairs (e.g. Backed Finance's `AAPLb`, traded as `AAPLBUSDT`) — a crypto
 * derivative that tracks the share price, not real equity ownership. Every
 * suggestion below is the *actual* tradable Binance symbol, confirmed
 * against a real `GET /api/v3/exchangeInfo`, the same convention Crypto's
 * list already follows (`BTCUSDT`, not bare `BTC`). Free text is always
 * still accepted; this only ever suggests, never restricts. */
const CRYPTO_INSTRUMENTS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT'];
const EQUITY_INSTRUMENTS = [
  'AAPLBUSDT',
  'MSFTBUSDT',
  'NVDABUSDT',
  'GOOGLBUSDT',
  'AMZNBUSDT',
  'TSLABUSDT',
  'METABUSDT',
  'NFLXBUSDT',
];

interface Props {
  assetClass: 'CRYPTO' | 'EQUITY';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
}

export function InstrumentPicker({ assetClass, value, onChange, placeholder, invalid }: Props) {
  const [focused, setFocused] = useState(false);
  const candidates = assetClass === 'CRYPTO' ? CRYPTO_INSTRUMENTS : EQUITY_INSTRUMENTS;
  const query = value.trim().toUpperCase();
  const matches = (query ? candidates.filter((c) => c.includes(query)) : candidates).filter((c) => c !== query);
  const showDropdown = focused && matches.length > 0;

  const selectSuggestion = (symbol: string) => {
    onChange(symbol);
    setFocused(false);
  };

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        // A tap on a suggestion below blurs this field first — delay
        // hiding the dropdown so that press has a chance to register.
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        style={{
          borderWidth: 1,
          borderColor: invalid ? colors.danger : colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          color: colors.textPrimary,
          backgroundColor: colors.surface,
          fontSize: 15,
        }}
      />
      {showDropdown ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceElevated,
            marginTop: spacing.xs,
            overflow: 'hidden',
          }}
        >
          {matches.map((symbol) => (
            <Pressable
              key={symbol}
              onPress={() => selectSuggestion(symbol)}
              accessibilityRole="button"
              style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}
            >
              <Text variant="body">{symbol}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
