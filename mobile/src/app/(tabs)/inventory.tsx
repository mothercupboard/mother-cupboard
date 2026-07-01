import type { ItemLocation } from '@/lib/database/models/inventory-item';

import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Chip, Divider, FAB, Icon, Searchbar, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import { InventoryItemCard } from '@/features/inventory/components/inventory-item-card';
import { useInventoryStore } from '@/features/inventory/inventory-store';
import { sortByExpiry } from '@/features/inventory/inventory.utils';
import { useInventoryItems } from '@/features/inventory/use-inventory-items';
import { FeatureTip } from '@/features/onboarding/components/feature-tip';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';

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
  const [search, setSearch] = useState('');
  const allItems = useInventoryItems();

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;
  const visibleItems = isSearching
    ? allItems.filter(i => i.name.toLowerCase().includes(query))
    : allItems.filter(i => i.location === activeLocation);
  const sortedItems = sortByExpiry(visibleItems);

  const snapTipSeen = useOnboardingStore(s => s.snapTipSeen);
  const dismissTip = useOnboardingStore(s => s.dismissTip);

  return (
    <View style={styles.container}>
      <SyncBanner />

      {!isSearching && !snapTipSeen && (
        <FeatureTip
          icon="camera-plus-outline"
          title="Tip: snap to add"
          body="Snap a photo of your fridge, freezer or cupboard shelves and we'll add everything at once — the fastest way to fill your cupboard. You can also upload a photo of a till receipt or a screenshot from your supermarket app."
          onDismiss={() => dismissTip('snapTipSeen')}
        />
      )}

      {allItems.length > 0 && (
        <Searchbar
          placeholder="Search your cupboard"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchbar}
          inputStyle={styles.searchbarInput}
        />
      )}

      {!isSearching && (
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
      )}

      <Divider />

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          { icon: 'pencil-outline', label: 'Add manually', onPress: () => router.push({ pathname: '/inventory/add-item', params: { manual: '1' } }) },
          { icon: 'barcode-scan', label: 'Scan barcode', onPress: () => router.push('/inventory/scan') },
          { icon: 'camera-plus-outline', label: 'Snap to add', onPress: () => router.push('/inventory/scan-receipt' as any) },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        style={styles.fab}
        testID="fab-group"
      />

      {sortedItems.length === 0
        ? (isSearching
            ? (
                <View style={styles.noResults}>
                  <Text variant="bodyMedium" style={styles.noResultsText}>
                    {`Nothing in your cupboard matches “${search.trim()}”.`}
                  </Text>
                </View>
              )
            : <InventoryEmptyState location={activeLocation} />)
        : (
            <FlatList
              data={sortedItems}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <InventoryItemCard item={item} showLocation={isSearching} />}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
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
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationChip: { borderRadius: 20 },
  chipText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13 },
  searchbar: {
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchbarInput: { fontFamily: 'Nunito_400Regular', minHeight: 0 },
  noResults: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 32 },
  noResultsText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
  },
  list: { paddingBottom: 96, paddingTop: 8 },
  fab: { bottom: 24, position: 'absolute', right: 16, zIndex: 10 },
});
