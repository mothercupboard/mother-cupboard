import type { ExpiryBadge } from '@/features/inventory/inventory.utils';
import type { InventoryItem } from '@/lib/database/models/inventory-item';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { getExpiryState } from '@/features/inventory/inventory.utils';

const BADGE_BG: Record<NonNullable<ExpiryBadge>['urgency'], string> = {
  amber: WarmHearthColors.expiryWarning,
  grey: WarmHearthColors.expiryPast,
  red: WarmHearthColors.expiryUrgent,
};

const LOCATION_META: Record<string, { icon: string; label: string }> = {
  fridge: { icon: 'fridge-outline', label: 'Fridge' },
  freezer: { icon: 'snowflake', label: 'Freezer' },
  cupboard: { icon: 'cupboard-outline', label: 'Cupboard' },
};

function BadgePill({ urgency, label }: { label: string; urgency: NonNullable<ExpiryBadge>['urgency'] }) {
  return (
    <View style={[styles.badge, { backgroundColor: BADGE_BG[urgency] }]}>
      <Text variant="labelSmall" style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function InventoryItemCard({ item, showLocation = false }: { item: InventoryItem; showLocation?: boolean }) {
  const badge = getExpiryState(item.expiryDate, item.expiryType);
  const expiryFormatted = item.expiryDate !== null
    ? new Date(item.expiryDate).toLocaleDateString('en-GB')
    : null;
  const location = LOCATION_META[item.location];

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/inventory/edit-item', params: { id: item.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${item.name}`}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Text variant="bodyLarge" style={styles.name} numberOfLines={2}>{item.name}</Text>
          {badge !== null && <BadgePill urgency={badge.urgency} label={badge.label} />}
        </View>

        {showLocation && location && (
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name={location.icon as any} size={14} color={WarmHearthColors.primary} />
            <Text variant="labelSmall" style={styles.locationText}>{location.label}</Text>
          </View>
        )}

        {item.quantity !== null && (
          <Text variant="bodySmall" style={styles.meta}>
            {item.quantity}
            {item.unit ? ` ${item.unit}` : ''}
          </Text>
        )}

        {expiryFormatted !== null && (
          <Text variant="bodySmall" style={styles.meta}>
            {item.expiryType === 'use_by' ? 'Use by' : 'Best before'}
            {' '}
            {expiryFormatted}
          </Text>
        )}

        {badge?.note !== null && badge?.note !== undefined && (
          <Text variant="bodySmall" style={styles.note}>{badge.note}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 12,
    elevation: 2,
    gap: 4,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    shadowColor: '#D4673A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  name: {
    color: WarmHearthColors.textPrimary,
    flex: 1,
    fontFamily: 'Nunito_600SemiBold',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
  meta: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  note: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular_Italic',
    marginTop: 4,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  locationText: {
    color: WarmHearthColors.primary,
    fontFamily: 'Nunito_600SemiBold',
  },
});
