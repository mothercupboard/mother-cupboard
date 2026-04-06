import type { ItemLocation } from '@/lib/database/models/inventory-item';

import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Chip, Divider, FAB, Icon, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import { InventoryItemCard } from '@/features/inventory/components/inventory-item-card';
import { useInventoryStore } from '@/features/inventory/inventory-store';
import { sortByExpiry } from '@/features/inventory/inventory.utils';
import { useInventoryItems } from '@/features/inventory/use-inventory-items';

const LOCATIONS: { label: string; value: ItemLocation }[] = [
  { label: 'Fridge', value: 'fridge' },
  { label: 'Freezer', value: 'freezer' },
  { label: 'Cupboard', value: 'cupboard' },
];

const SYNC_ICON: Record<string, string> = {
  error: 'cloud-alert-outline',
  idle: 'cloud-outline',
  pending: 'cloud-upload-outline',
  synced: 'cloud-check-outline',
  syncing: 'cloud-sync-outline',
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

export default function InventoryScreen() {
  const [activeLocation, setActiveLocation] = useState<ItemLocation>('fridge');
  const [fabOpen, setFabOpen] = useState(false);
  const items = useInventoryItems(activeLocation);
  const sortedItems = sortByExpiry(items);

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

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          { icon: 'pencil-outline', label: 'Add manually', onPress: () => router.push({ pathname: '/inventory/add-item', params: { manual: '1' } }) },
          { icon: 'magnify', label: 'Search by name', onPress: () => router.push('/inventory/search') },
          { icon: 'barcode-scan', label: 'Scan barcode', onPress: () => router.push('/inventory/scan') },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        style={styles.fab}
      />

      {sortedItems.length === 0
        ? <InventoryEmptyState location={activeLocation} />
        : (
            <FlatList
              data={sortedItems}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <InventoryItemCard item={item} />}
              contentContainerStyle={styles.list}
            />
          )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: WarmHearthColors.background, flex: 1 },
  syncBanner: {
    alignItems: 'center',
    backgroundColor: WarmHearthColors.surface,
    borderBottomColor: WarmHearthColors.outline,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  syncText: { color: WarmHearthColors.textSecondary, fontFamily: 'Nunito_400Regular' },
  locationTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationChip: { borderRadius: 20 },
  chipText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13 },
  list: { paddingBottom: 96, paddingTop: 8 },
  fab: { bottom: 24, position: 'absolute', right: 16 },
});
