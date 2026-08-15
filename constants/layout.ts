export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const cardPadding = {
  default: 16,
  hero: 24,
} as const;

export const sectionGap = {
  default: 24,
  block: 48,
} as const;

export const border = {
  hairline: 1,
  emphasized: 1.5,
} as const;

export const motion = {
  fast: 120,
  base: 220,
  slow: 400,
} as const;

/** Below this width the app uses bottom navigation + stacked/card layouts. */
export const DESKTOP_BREAKPOINT = 1024;
/** Below this width, screens use single-column mobile layouts even off-nav. */
export const TABLET_BREAKPOINT = 768;

export const SIDEBAR_WIDTH = 240;
export const DRAWER_WIDTH = 480;
export const HEADER_HEIGHT = 64;
export const BOTTOM_NAV_HEIGHT = 64;
