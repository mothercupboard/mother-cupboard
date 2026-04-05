import type { MD3Theme } from 'react-native-paper';
import { configureFonts, MD3LightTheme } from 'react-native-paper';

// Warm Hearth colour tokens — all design decisions originate here
export const WarmHearthColors = {
  // Primary palette
  primary: '#D4673A', // Terracotta — active states, CTAs, active tab
  primaryDark: '#A84E28', // Burnt Sienna — pressed states, text on light
  secondary: '#3A7D44', // Forest Green — secondary actions, success states
  background: '#FAF6F0', // Warm Cream — app background, tab bar
  surface: '#FFFFFF', // Soft White — cards, elevated surfaces
  textPrimary: '#2C2420', // Warm Charcoal — body text
  textSecondary: '#7A6E68', // Warm Grey — labels, inactive tabs

  // Semantic colours — expiry & status
  expiryWarning: '#F0A500', // Soft Amber — approaching expiry (best-before)
  expiryUrgent: '#C0392B', // Warm Red — use-by urgent alert
  expiryPast: '#7A6E68', // Warm Grey — 3+ days past (see Story 2.5 three-state model)
  success: '#6BAE75', // Sage Green — mark as cooked, positive feedback
  adventurous: '#7B3FA0', // Deep Plum — high adventurousness indicator
  shoppingList: '#4A5FA8', // Warm Indigo — shopping list accent
  outline: '#C4B8B0', // Warm Taupe — borders, dividers
} as const;

const fontConfig = {
  fontFamily: 'Nunito_400Regular',
};

export const WarmHearthTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: WarmHearthColors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#FFD9C5',
    onPrimaryContainer: WarmHearthColors.primaryDark,
    secondary: WarmHearthColors.secondary,
    onSecondary: '#FFFFFF',
    background: WarmHearthColors.background,
    onBackground: WarmHearthColors.textPrimary,
    surface: WarmHearthColors.surface,
    onSurface: WarmHearthColors.textPrimary,
    surfaceVariant: '#F0EAE4',
    onSurfaceVariant: WarmHearthColors.textSecondary,
    error: WarmHearthColors.expiryUrgent,
    onError: '#FFFFFF',
    outline: WarmHearthColors.outline,
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12, // 12px border radius — card-forward per UX spec
};
