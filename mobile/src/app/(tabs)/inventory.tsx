import type { InventoryItem, ItemLocation } from '@/lib/database/models/inventory-item';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Chip, Divider, Icon, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useInventoryStore } from '@/features/inventory/inventory-store';
import { useInventoryItems } from '@/features/inventory/use-inventory-items';

const LOCATIONS: { label: string; value: ItemLocation }[] = [
  { label: 'Fridge', value: 'fridge' },
  { label: 'Freezer', value: 'freezer' },
  { label: 'Cupboard', value: 'cupboard' },
];

const SYNC_ICON: Record<string, string> = {
  idle: 'cloud-outline',
  syncing: 'cloud-sync-outline',
  synced: 'cloud-check-outline',
  error: 'cloud-alert-outline',
  pending: 'cloud-upload-outline',
};

function SyncBanner() {
  const syncStatus = useInventoryStore(s => s.syncStatus);
  const lastSyncedAt = useInventoryStore(s => s.lastSyncedAt);

  if (syncStatus === 'synced' && lastSyncedAt === null)
    return null;

  let label: string | null = null;
  if (syncStatus === 'syncing') {
    label = 'Syncing…';
  }
  else if (syncStatus === 'error') {
    label = 'Sync failed — changes saved locally';
  }
  else if (syncStatus === 'pending') {
    label = 'Changes queued — will sync when online';
  }
  else if (lastSyncedAt !== null) {
    label = `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}`;
  }

  if (!label)
    return null;

  return (
    <View style={styles.syncBanner}>
      <Icon
        source={SYNC_ICON[syncStatus]}
        size={16}
        color={syncStatus === 'error' ? WarmHearthColors.expiryUrgent : WarmHearthColors.textSecondary}
      />
      <Text variant="labelSmall" style={styles.syncText}>{label}</Text>
    </View>
  );
}

function ItemRow({ item }: { item: InventoryItem }) {
  const hasExpiry = item.expiryDate !== null;
  const expiryLabel = hasExpiry
    ? new Date(item.expiryDate!).toLocaleDateString('en-GB')
    : null;

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text variant="bodyLarge" style={styles.itemName}>{item.name}</Text>
        {item.quantity !== null && (
          <Text variant="bodySmall" style={styles.itemMeta}>
            {item.quantity}
            {item.unit ? ` ${item.unit}` : ''}
          </Text>
        )}
      </View>
      {hasExpiry && (
        <Text
          variant="labelSmall"
          style={[
            styles.expiryLabel,
            item.expiryType === 'use_by' && styles.expiryUrgent,
          ]}
        >
          {item.expiryType === 'use_by' ? 'Use by' : 'Best before'}
          {' '}
          {expiryLabel}
        </Text>
      )}
    </View>
  );
}

export default function InventoryScreen() {
  const [activeLocation, setActiveLocation] = useState<ItemLocation>('fridge');
  const items = useInventoryItems(activeLocation);

  return (
    <View style={styles.container}>
      <SyncBanner />

      <View style={styles.locationTabs}>
        {LOCATIONS.map(loc => (
          <Chip
            key={loc.value}
            selected={activeLocation === loc.value}
            onPress={() => setActiveLocation(loc.value)}
            style={styles.locationChip}
            textStyle={styles.chipText}
          >
            {loc.label}
          </Chip>
        ))}
      </View>

      <Divider />

      {items.length === 0
        ? (
            <View style={styles.emptyState}>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Nothing in your
                {' '}
                {activeLocation}
                {' '}
                yet.
              </Text>
            </View>
          )
        : (
            <FlatList
              data={items}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <ItemRow item={item} />}
              ItemSeparatorComponent={Divider}
              contentContainerStyle={styles.list}
            />
          )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WarmHearthColors.background,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: WarmHearthColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: WarmHearthColors.outline,
  },
  syncText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  locationTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationChip: { borderRadius: 20 },
  chipText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13 },
  list: { paddingBottom: 24 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemInfo: { flex: 1, gap: 2 },
  itemName: {
    fontFamily: 'Nunito_600SemiBold',
    color: WarmHearthColors.textPrimary,
  },
  itemMeta: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
  },
  expiryLabel: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
    fontSize: 12,
  },
  expiryUrgent: { color: WarmHearthColors.expiryUrgent },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
    textAlign: 'center',
  },
});
