import { useWindowDimensions } from 'react-native';
import { DESKTOP_BREAKPOINT, TABLET_BREAKPOINT } from '../constants/layout';

export interface Responsive {
  width: number;
  height: number;
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
}

/** Central breakpoint source — every screen must derive layout from this, not ad-hoc width checks. */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = !isDesktop && width >= TABLET_BREAKPOINT;
  const isMobile = !isDesktop && !isTablet;
  return { width, height, isDesktop, isTablet, isMobile };
}
