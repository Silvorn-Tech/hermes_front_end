import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, spacing, motion, DRAWER_WIDTH } from '../../constants';
import { useResponsive } from '../../hooks/useResponsive';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Right-side drawer on desktop (list stays visible underneath), full-screen
 * push view on mobile. Mounted directly by a route (see app/(app)/bots/[id]
 * and the trading detail routes), which use `presentation: 'transparentModal'`
 * so the underlying list screen remains visible for the desktop backdrop.
 */
export function DetailDrawer({ title, onClose, children }: Props) {
  const { isDesktop } = useResponsive();
  const translateX = useRef(new Animated.Value(isDesktop ? DRAWER_WIDTH : 0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: motion.base, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: motion.base, useNativeDriver: true }),
    ]).start();
  }, [translateX, backdropOpacity]);

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text variant="heading">{title}</Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        hitSlop={8}
        style={{ padding: spacing.xs }}
      >
        <Ionicons name="close" size={22} color={colors.textSecondary} />
      </Pressable>
    </View>
  );

  if (!isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {header}
        {children}
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: DRAWER_WIDTH,
          backgroundColor: colors.surface,
          borderLeftWidth: 1,
          borderLeftColor: colors.border,
          transform: [{ translateX }],
          ...Platform.select({ web: { boxShadow: '-16px 0 32px rgba(0,0,0,0.35)' }, default: {} }),
        }}
      >
        {header}
        {children}
      </Animated.View>
    </View>
  );
}
