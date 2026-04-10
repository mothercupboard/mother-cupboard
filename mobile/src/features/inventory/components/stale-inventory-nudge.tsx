import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useStaleInventory } from '@/features/inventory/use-stale-inventory';

/**
 * A gentle home-screen card shown when the user hasn't touched their
 * inventory for 7+ days. Tapping it navigates to the Cupboard tab.
 * Renders nothing when the inventory is fresh, empty, or still loading.
 */
export function StaleInventoryNudge() {
  const staleness = useStaleInventory();

  if (staleness.status !== 'stale')
    return null;

  const weeks = Math.floor(staleness.daysSinceUpdate / 7);
  const timeLabel = weeks >= 2
    ? `${weeks} weeks`
    : `${staleness.daysSinceUpdate} days`;

  return (
    <Pressable
      onPress={() => router.navigate('/(tabs)/inventory')}
      accessibilityRole="button"
      accessibilityLabel="Review your cupboard"
    >
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons
            name="archive-refresh-outline"
            size={22}
            color={WarmHearthColors.textSecondary}
          />
          <Text variant="titleSmall" style={styles.heading}>
            Cupboard check-in
          </Text>
        </View>

        <Text variant="bodyMedium" style={styles.body}>
          {'Your inventory is '}
          {timeLabel}
          {' old. A quick review helps keep your reminders accurate and your meal suggestions relevant.'}
        </Text>

        <Text variant="labelMedium" style={styles.cta}>
          Review your cupboard →
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WarmHearthColors.surface,
    borderLeftColor: WarmHearthColors.outline,
    borderLeftWidth: 4,
    borderRadius: 12,
    elevation: 2,
    gap: 8,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#D4673A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heading: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  body: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
  cta: {
    color: WarmHearthColors.primary,
    fontFamily: 'Nunito_600SemiBold',
    marginTop: 4,
  },
});
