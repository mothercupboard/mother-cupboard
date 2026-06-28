import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, IconButton, Modal, Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useDatabase } from '@/lib/database/provider';
import type { InventoryItem, ItemLocation } from '@/lib/database/models/inventory-item';
import { parseReceiptImage } from '@/lib/ai/voice-parser';
import type { ReceiptItem } from '@/lib/ai/voice-parser';

type EditableItem = ReceiptItem & { id: string };
type ModalState = 'idle' | 'parsing' | 'review';

const LOCATION_ICONS: Record<string, string> = {
  fridge: 'fridge-outline',
  freezer: 'snowflake',
  cupboard: 'archive-outline',
  unknown: 'help-circle-outline',
};

// Map parsed receipt items to editable rows, defaulting any unrecognised
// location to "cupboard" so the item is addable straight away. The user can
// still change it with the location chips.
function toEditableItems(parsed: ReceiptItem[]): EditableItem[] {
  return parsed.map((p, i) => ({
    ...p,
    location: p.location === 'unknown' ? 'cupboard' : p.location,
    id: String(i),
  }));
}

interface Props {
  visible: boolean;
  initialBase64?: string | null;
  onDismiss: () => void;
}

export function ReceiptScannerModal({ visible, initialBase64, onDismiss }: Props) {
  const db = useDatabase();
  const [state, setState] = useState<ModalState>('idle');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible && initialBase64) {
      setParseError(null);
      setState('parsing');
      parseReceiptImage(initialBase64)
        .then(parsed => {
          const valid = parsed.filter(p => p.name && p.name.trim().length > 0);
          if (valid.length === 0) {
            setParseError('No food items found. Try a clearer image.');
            setState('idle');
            return;
          }
          setItems(toEditableItems(valid));
          setState('review');
        })
        .catch(err => {
          setParseError('Parsing failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
          setState('idle');
        });
    }
  }, [visible, initialBase64]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Reset transient state whenever the modal opens, so a previous session can't
  // leave the buttons stuck (e.g. saving=true) when scanning a second receipt.
  useEffect(() => {
    if (visible && !initialBase64) {
      setSaving(false);
      setParseError(null);
      setState('idle');
      setItems([]);
    }
  }, [visible, initialBase64]);

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Camera needed', 'Please allow camera access to scan receipts.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) return;

    setParseError(null);
    setState('parsing');
    try {
      const parsed = await parseReceiptImage(result.assets[0].base64);
      if (parsed.length === 0) {
        setParseError('No food items found on the receipt. Try a clearer photo.');
        setState('idle');
        return;
      }
      setItems(toEditableItems(parsed));
      setState('review');
    } catch (e) {
      console.error('[Receipt] Parse error:', e);
      setParseError('Could not read receipt. Please try again with a clearer photo.');
      setState('idle');
    }
  }

  async function handleChoosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Photos access needed', 'Please allow photo library access to select receipt images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setState('parsing');
    try {
      const parsed = await parseReceiptImage(result.assets[0].base64);
      const valid = parsed.filter(p => p.name && p.name.trim().length > 0);
      if (valid.length === 0) {
        setParseError('No food items found. Try a clearer image of your receipt.');
        setState('idle');
        return;
      }
      setItems(toEditableItems(valid));
      setState('review');
    } catch (err) {
      setParseError('Parsing failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setState('idle');
    }
  }

  function removeItem(id: string) {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      if (next.length === 0) setState('idle');
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
      handleClose();
    } catch (e) {
      console.error('[Receipt] Save error:', e);
      Alert.alert('Save failed', 'Could not save items. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setItems([]);
    setState('idle');
    onDismiss();
  }

  const addableCount = items.filter(i => i.location !== 'unknown').length;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        dismissable={true}
        contentContainerStyle={styles.modal}
      >
        {/* Idle — prompt to take photo */}
        {state === 'idle' && (
          <View style={styles.centredContent}>
            <MaterialCommunityIcons name="camera-plus-outline" size={52} color={WarmHearthColors.primary} />
            <Text variant="titleMedium" style={styles.title}>Snap to add items</Text>
            <Text variant="bodyMedium" style={styles.body}>
              Snap your shelves, a till receipt, or a supermarket-app screenshot, and we'll add the food items to your inventory automatically.
            </Text>
            {parseError && (
            <Text variant="bodyMedium" style={{ color: '#B03A2E', fontFamily: 'Nunito_400Regular', textAlign: 'center', marginBottom: 8 }}>
              {parseError}
            </Text>
          )}
          <Button
              mode="contained"
              icon="camera"
              onPress={handleTakePhoto}
              style={styles.fullButton}
              labelStyle={styles.buttonLabel}
            >
              Take Photo
            </Button>
            <Button
              mode="outlined"
              icon="image-multiple"
              onPress={handleChoosePhoto}
              style={styles.photoButton}
              labelStyle={styles.buttonLabel}
            >
              Choose from Photos
            </Button>
            <Button mode="text" onPress={handleClose} labelStyle={styles.cancelLabel}>
              Cancel
            </Button>
          </View>
        )}

        {/* Parsing — spinner */}
        {state === 'parsing' && (
          <View style={styles.centredContent}>
            <ActivityIndicator size="large" color={WarmHearthColors.primary} />
            <Text variant="bodyMedium" style={styles.loadingText}>
              Reading your image…
            </Text>
            <Text variant="bodySmall" style={styles.loadingSubtext}>
              This takes a few seconds
            </Text>
            <Button mode="text" onPress={handleClose} labelStyle={styles.cancelLabel}>
              Cancel
            </Button>
          </View>
        )}

        {/* Review — list of parsed items */}
        {state === 'review' && (
          <View style={styles.reviewContainer}>
            <Text variant="titleMedium" style={styles.title}>
              {items.length} item{items.length !== 1 ? 's' : ''} found
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Tap a location to change it. Tap ✕ to remove an item.
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
                      {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
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
                        Choose a location above to include this item
                      </Text>
                    )}
                  </View>
                  <IconButton
                    icon="close"
                    size={18}
                    onPress={() => removeItem(item.id)}
                    iconColor={WarmHearthColors.textSecondary}
                  />
                </View>
              )}
            />

            <View style={[styles.reviewActions, { paddingBottom: insets.bottom + 16 }]}>
              <Button mode="text" onPress={handleClose}>Cancel</Button>
              <Button
                mode="contained"
                onPress={handleAddAll}
                loading={saving}
                disabled={saving || addableCount === 0}
                style={styles.addButton}
                labelStyle={styles.buttonLabel}
              >
                {addableCount === 0 ? 'No items selected' : `Add ${addableCount} to inventory`}
              </Button>
            </View>
          </View>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 16,
    margin: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  centredContent: {
    alignItems: 'center',
    gap: 14,
    padding: 28,
  },
  reviewContainer: {
    flex: 1,
    padding: 20,
  },
  title: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    marginBottom: 4,
    textAlign: 'center',
  },
  body: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingText: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
    marginTop: 8,
  },
  loadingSubtext: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  fullButton: {
    borderRadius: 12,
    width: '100%',
  },
  buttonLabel: {
    fontFamily: 'Nunito_700Bold',
  },
  cancelLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  list: {
    flex: 1,
    marginVertical: 12,
  },
  itemRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 10,
  },
  itemInfo: {
    flex: 1,
    gap: 6,
  },
  itemName: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    height: 28,
  },
  chipActive: {
    backgroundColor: WarmHearthColors.primary + '22',
  },
  chipText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
  },
  unknownHint: {
    color: WarmHearthColors.expiryUrgent,
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
  },
  separator: {
    backgroundColor: WarmHearthColors.outline,
    height: StyleSheet.hairlineWidth,
    opacity: 0.4,
  },
  reviewActions: {
    alignItems: 'center',
    borderTopColor: WarmHearthColors.outline,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  addButton: {
    borderRadius: 10,
  },
  photoButton: { borderColor: '#7B5EA7', borderRadius: 12, marginTop: 8 },
});
