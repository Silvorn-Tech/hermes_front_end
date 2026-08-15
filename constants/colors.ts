/**
 * Hermes color system.
 *
 * Source of truth is defined in OKLCH (see comments) for perceptual
 * consistency across the palette. React Native's style engine does not
 * parse oklch() at runtime, so each token is pre-converted to its sRGB hex
 * equivalent via the OKLab transform. If a token changes, regenerate the
 * hex value from its OKLCH definition rather than hand-picking a new hex.
 */

export const neutrals = {
  /** oklch(0.16 0.006 250) */
  background: '#0b0d10',
  /** oklch(0.20 0.006 250) */
  surface: '#141619',
  /** oklch(0.25 0.007 250) */
  surfaceElevated: '#1f2225',
  /** oklch(0.32 0.008 250) */
  border: '#303337',
  /** oklch(0.96 0.003 250) */
  textPrimary: '#f0f2f4',
  /** oklch(0.72 0.006 250) */
  textSecondary: '#a2a5a8',
  /** oklch(0.52 0.006 250) */
  textMuted: '#66696c',
} as const;

export const brand = {
  /** oklch(0.62 0.09 240) */
  brand: '#508db7',
  /** oklch(0.78 0.14 85) — reserved for AI / Signals / Insights */
  aiAccent: '#e0af3b',
} as const;

export const semantic = {
  /** oklch(0.72 0.12 150) */
  success: '#69ba7c',
  /** oklch(0.78 0.15 85) */
  warning: '#e3ae28',
  /** oklch(0.62 0.18 25) */
  danger: '#de4e4b',
} as const;

export const risk = {
  /** oklch(0.55 0.03 150) */
  normal: '#667768',
  /** oklch(0.72 0.15 55) */
  elevated: '#eb883b',
  /** oklch(0.68 0.17 40) */
  alert: '#ec6d3d',
  /** oklch(0.60 0.20 22) */
  critical: '#de3a46',
} as const;

export const bots = {
  /** oklch(0.65 0.10 230) */
  sentinel: '#449ac0',
  /** oklch(0.68 0.09 165) */
  equilibrium: '#5eaa8a',
  /** oklch(0.62 0.14 15) */
  vortex: '#cc5e6b',
} as const;

export const colors = {
  ...neutrals,
  ...brand,
  ...semantic,
  risk,
  bots,
} as const;

export type ColorTokens = typeof colors;
