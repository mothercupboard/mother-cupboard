import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WarmHearthColors } from '@/components/common/paper-theme';
import { useDatabase } from '@/lib/database/provider';
import type { InventoryItem, ItemLocation } from '@/lib/database/models/inventory-item';
import { parseReceiptImage } from '@/lib/ai/voice-parser';
import type { ReceiptItem } from '@/lib/ai/voice-parser';

type EditableItem = ReceiptItem & { id: string };
type ScreenState = 'choose' | 'parsing' | 'review' | 'done';

const LOCATION_ICONS: Record<string, string> = {
  fridge: 'fridge-outline',
  freezer: 'snowflake',
  cupboard: 'archive-outline',
  unknown: 'help-circle-outline',
};

export default function ScanReceiptScreen() {
  const db = useDatabase();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScreenState>('choose');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAndParse(useCamera: boolean) {
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') { setError('Camera permission needed'); return; }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') { setError('Photo library permission needed'); return; }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.85 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.8 });

      if (result.canceled || !result.assets[0]?.base64) return;

      setError(null);
      setState('parsing');

      const parsed = await parseReceiptImage(result.assets[0].base64);
      const valid = parsed.filter(p => p.name && p.name.trim().length > 0);

      if (valid.length === 0) {
        setError('No food items found. Try a clearer image.');
        setState('choose');
        return;
      }

      // Default any unrecognised location to "cupboard" so items are addable
      // straight away; the user can still change it with the chips.
      setItems(valid.map((p, i) => ({ ...p, location: p.location === 'unknown' ? 'cupboard' : p.location, id: String(i) })));
      setState('review');
    } catch (err) {
      setError('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setState('choose');
    }
  }

  function removeItem(id: string) {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      if (next.length === 0) setState('choose');
      return next;
    });
  }

  function changeLocation(id: string, loc: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, location: loc as ReceiptItem['location'] } : i));
  }

  async function handleAddAll() {
    setSaving(true);
    const toAdd = items.filter(i => i.location !== 'unknown');
    try {
      await db.write(async () => {
        for (const item of toAdd) {
          await db.get<InventoryItem>('inventory_items').create(inv => {
            inv.name = item.name;
            inv.quantity = item.quantity ?? 1;
            inv.unit = item.unit || 'items';
            inv.location = item.location as ItemLocation;
            inv.expiryType = item.expiryType || null;
            inv.expiryDate = null;
            inv.barcode = null;
            inv.category = null;
            inv.notes = null;
            inv.isDeleted = false;
            inv.updatedAt = new Date();
          });
        }
      });
      setState('done');
      setTimeout(() => router.replace('/(tabs)/inventory'), 1500);
    } catch {
      setError('Could not save items. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const addableCount = items.filter(i => i.location !== 'unknown').length;

  if (state === 'done') {
    return (
      <View style={styles.centred}>
        <MaterialCommunityIcons name="check-circle" size={56} color={WarmHearthColors.success} />
        <Text variant="titleMedium" style={styles.title}>Items added!</Text>
      </View>
    );
  }

  if (state === 'parsing') {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={WarmHearthColors.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>Reading your receipt...</Text>
        <Text variant="bodySmall" style={styles.subtext}>This takes a few seconds</Text>
      </View>
    );
  }

  if (state === 'review') {
    return (
      <View style={styles.container}>
        <Text variant="titleMedium" style={styles.title}>
          {items.length} item{items.length !== 1 ? 's' : ''} found
        </Text>
        <Text variant="bodySmall" style={styles.subtext}>
          Tap a location to change it. Tap x to remove.
        </Text>
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          style={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text variant="bodyMedium" style={styles.itemName}>
                  {item.quantity > 1 ? item.quantity + 'x ' : ''}{item.name}
                </Text>
                <View style={styles.chipRow}>
                  {(['fridge', 'freezer', 'cupboard'] as const).map(loc => (
                    <Chip
                      key={loc}
                      compact
                      selected={item.location === loc}
                      onPress={() => changeLocation(item.id, loc)}
                      icon={LOCATION_ICONS[loc]}
                      style={[styles.chip, item.location === loc && styles.chipActive]}
                      textStyle={styles.chipText}
                    >
                      {loc.charAt(0).toUpperCase() + loc.slice(1)}
                    </Chip>
                  ))}
                </View>
                {item.location === 'unknown' && (
                  <Text variant="bodySmall" style={styles.unknownHint}>
                    Choose a location to include this item
                  </Text>
                )}
              </View>
              <IconButton icon="close" size={18} onPress={() => removeItem(item.id)} iconColor={WarmHearthColors.textSecondary} />
            </View>
          )}
        />
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Button mode="text" onPress={() => router.back()}>Cancel</Button>
          <Button
            mode="contained"
            onPress={handleAddAll}
            loading={saving}
            disabled={saving || addableCount === 0}
            style={styles.addBtn}
            labelStyle={styles.btnLabel}
          >
            {addableCount === 0 ? 'No items selected' : 'Add ' + addableCount + ' to inventory'}
          </Button>
        </View>
      </View>
    );
  }

  // choose state
  return (
    <View style={styles.centred}>
      <MaterialCommunityIcons name="camera-plus-outline" size={52} color={WarmHearthColors.primary} />
      <Text variant="titleMedium" style={styles.title}>Snap to add items</Text>
      <Text variant="bodyMedium" style={styles.subtext}>
        Snap your fridge, freezer or cupboard shelves to add everything at once — or use a photo of a till receipt or a screenshot from your supermarket app. We'll read it and add the items to your inventory.
      </Text>
      {error && <Text variant="bodyMedium" style={styles.errorText}>{error}</Text>}
      <Button mode="contained" icon="camera" onPress={() => pickAndParse(true)} style={styles.fullBtn} labelStyle={styles.btnLabel}>
        Take Photo
      </Button>
      <Button mode="outlined" icon="image-multiple" onPress={() => pickAndParse(false)} style={styles.outlineBtn} labelStyle={styles.btnLabel}>
        Choose from Photos
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WarmHearthColors.background, padding: 20 },
  centred: { flex: 1, backgroundColor: WarmHearthColors.background, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  title: { color: WarmHearthColors.textPrimary, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  subtext: { color: WarmHearthColors.textSecondary, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 20 },
  loadingText: { color: WarmHearthColors.textPrimary, fontFamily: 'Nunito_600SemiBold', marginTop: 8 },
  errorText: { color: '#B03A2E', fontFamily: 'Nunito_400Regular', textAlign: 'center' },
  fullBtn: { borderRadius: 12, width: '100%' },
  outlineBtn: { borderRadius: 12, width: '100%', borderColor: WarmHearthColors.primary },
  btnLabel: { fontFamily: 'Nunito_700Bold' },
  list: { flex: 1, marginVertical: 12 },
  itemRow: { alignItems: 'flex-start', flexDirection: 'row', paddingVertical: 10 },
  itemInfo: { flex: 1, gap: 6 },
  itemName: { color: WarmHearthColors.textPrimary, fontFamily: 'Nunito_600SemiBold' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { height: 28 },
  chipActive: { backgroundColor: WarmHearthColors.primary + '22' },
  chipText: { fontFamily: 'Nunito_400Regular', fontSize: 11 },
  unknownHint: { color: WarmHearthColors.expiryUrgent, fontFamily: 'Nunito_400Regular', fontStyle: 'italic' },
  separator: { backgroundColor: WarmHearthColors.outline, height: StyleSheet.hairlineWidth, opacity: 0.4 },
  actions: { alignItems: 'center', borderTopColor: WarmHearthColors.outline, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  addBtn: { borderRadius: 10 },
});
