import { Ionicons } from '@expo/vector-icons';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const primaryNavItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'grid-outline' },
  { key: 'bots', label: 'Bots', href: '/bots', icon: 'layers-outline' },
  { key: 'trading', label: 'Trading', href: '/trading', icon: 'swap-horizontal-outline' },
  { key: 'risk', label: 'Risk', href: '/risk', icon: 'shield-checkmark-outline' },
  { key: 'signals', label: 'Signals', href: '/signals', icon: 'pulse-outline' },
];

/** Risk is reached through the header indicator on mobile, not the bottom bar. */
export const mobileNavItems: NavItem[] = primaryNavItems.filter((item) => item.key !== 'risk');

export const settingsNavItem: NavItem = {
  key: 'settings',
  label: 'Settings',
  href: '/settings',
  icon: 'settings-outline',
};
