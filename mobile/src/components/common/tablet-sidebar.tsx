import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WarmHearthColors } from '@/components/common/paper-theme';

/** Width of the sidebar in points. Used here and in the tab layout. */
export const SIDEBAR_WIDTH = 220;

const TAB_ICONS: Record<string, string> = {
  index: 'home',
  inventory: 'archive',
  suggest: 'lightbulb-outline',
  'shopping-list': 'format-list-bulleted',
  settings: 'cog-outline',
};

const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  inventory: 'Cupboard',
  suggest: 'Suggest',
  'shopping-list': 'List',
  settings: 'Settings',
};

/**
 * Renders a permanent left-hand sidebar for iPad.
 * Drop this in as the `tabBar` prop on <Tabs> when `useIsTablet()` is true.
 */
export function TabletSidebar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.sidebar,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 },
      ]}
    >
      {/* Branding */}
      <View style={styles.brand}>
        <MaterialCommunityIcons
          name="fridge-outline"
          size={26}
          color={WarmHearthColors.primary}
        />
        <Text style={styles.brandText}>Mother Cupboard</Text>
      </View>

      <View style={styles.divider} />

      {/* Nav items */}
      <View style={styles.nav}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icon = TAB_ICONS[route.name] ?? 'circle-outline';
          const label = TAB_LABELS[route.name] ?? route.name;

          function onPress() {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.navItem,
                isFocused && styles.navItemActive,
                pressed && !isFocused && styles.navItemPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
            >
              <MaterialCommunityIcons
                name={icon as 'home'}
                size={22}
                color={isFocused ? WarmHearthColors.primary : WarmHearthColors.textSecondary}
              />
              <Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: WarmHearthColors.surface,
    borderRightColor: WarmHearthColors.outline,
    borderRightWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    paddingHorizontal: 12,
    position: 'absolute',
    top: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 10,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  brandText: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
  },
  divider: {
    backgroundColor: WarmHearthColors.outline,
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
    marginHorizontal: 8,
  },
  nav: {
    gap: 2,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  navItemActive: {
    backgroundColor: `${WarmHearthColors.primary}18`,
  },
  navItemPressed: {
    backgroundColor: `${WarmHearthColors.primary}0D`,
  },
  navLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
  },
  navLabelActive: {
    color: WarmHearthColors.primary,
    fontFamily: 'Nunito_700Bold',
  },
});
