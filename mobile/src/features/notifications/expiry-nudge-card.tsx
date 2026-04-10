import type { ExpiryBadge } from '@/features/inventory/inventory.utils';
import type { InventoryItem } from '@/lib/database/models/inventory-item';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { getExpiryState, sortByExpiry } from '@/features/inventory/inventory.utils';
import { useExpiringItems } from '@/features/notifications/use-expiring-items';

type NudgeItem = {
  id: string;
  name: string;
  badge: NonNullable<ExpiryBadge>;
};

function toNudgeItems(items: InventoryItem[]): NudgeItem[] {
  return sortByExpiry(items)
    .map((item) => {
      const badge = getExpiryState(item.expiryDate, item.expiryType);
      return badge ? { id: item.id, name: item.name, badge } : null;
    })
    .filter((n): n is NudgeItem => n !== null);
}

const ICON_BY_URGENCY: Record<NonNullable<ExpiryBadge>['urgency'], string> = {
  red: 'alert-circle',
  amber: 'clock-alert-outline',
  grey: 'information-outline',
};

const COLOR_BY_URGENCY: Record<NonNullable<ExpiryBadge>['urgency'], string> = {
  red: WarmHearthColors.expiryUrgent,
  amber: WarmHearthColors.expiryWarning,
  grey: WarmHearthColors.expiryPast,
};

const BORDER_BY_URGENCY: Record<NonNullable<ExpiryBadge>['urgency'], string> = {
  red: '#F5D0CC',
  amber: '#FAEAC8',
  grey: '#E0DBD7',
};

function NudgeRow({ item }: { item: NudgeItem }) {
  const color = COLOR_BY_URGENCY[item.badge.urgency];
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons
        name={ICON_BY_URGENCY[item.badge.urgency] as 'alert-circle'}
        size={18}
        color={color}
      />
      <Text variant="bodyMedium" style={styles.itemName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text variant="labelSmall" style={[styles.label, { color }]}>
        {item.badge.label}
      </Text>
    </View>
  );
}

/**
 * A card for the home screen that shows items approaching or past expiry.
 * Renders nothing when the cupboard is all-clear.
 */
export function ExpiryNudgeCard() {
  const expiring = useExpiringItems();
  const nudgeItems = toNudgeItems(expiring);

  if (nudgeItems.length === 0)
    return null;

  const topUrgency = nudgeItems[0].badge.urgency;
  const borderColor = BORDER_BY_URGENCY[topUrgency];
  const accentColor = COLOR_BY_URGENCY[topUrgency];

  return (
    <Pressable
      onPress={() => router.navigate('/(tabs)/inventory')}
      accessibilityRole="button"
      accessibilityLabel="View items approaching expiry"
    >
      <View style={[styles.card, { borderLeftColor: borderColor }]}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="fridge-alert-outline" size={22} color={accentColor} />
          <Text variant="titleSmall" style={styles.heading}>
            {nudgeItems.length === 1
              ? '1 item needs attention'
              : `${nudgeItems.length} items need attention`}
          </Text>
        </View>

        {nudgeItems.slice(0, 5).map(item => (
          <NudgeRow key={item.id} item={item} />
        ))}

        {nudgeItems.length > 5 && (
          <Text variant="bodySmall" style={styles.moreText}>
            +
            {nudgeItems.length - 5}
            {' '}
            more — tap to view
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WarmHearthColors.surface,
    borderLeftWidth: 4,
    borderRadius: 12,
    elevation: 2,
    gap: 8,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#D4673A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  heading: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  itemName: {
    color: WarmHearthColors.textPrimary,
    flex: 1,
    fontFamily: 'Nunito_400Regular',
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
  },
  moreText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular_Italic',
    marginTop: 4,
  },
});
