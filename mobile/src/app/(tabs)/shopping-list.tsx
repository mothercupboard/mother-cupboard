import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { Button, Dialog, Divider, Portal, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useDatabase } from '@/lib/database/provider';
import type { InventoryItem } from '@/lib/database/models/inventory-item';
import { ReceiptScannerModal } from '@/features/inventory/components/receipt-scanner-modal';
import { FeatureTip } from '@/features/onboarding/components/feature-tip';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { AddItemInput } from '@/features/shopping-list/components/add-item-input';
import { ShoppingListItemRow } from '@/features/shopping-list/components/shopping-list-item-row';
import { useShoppingListStore } from '@/features/shopping-list/shopping-list-store';
import { parseShoppingVoice, startVoiceRecording, stopAndTranscribe } from '@/lib/ai/voice-parser';

function ProgressHeader({ total, purchased }: { purchased: number; total: number }) {
  if (total === 0) return null;
  const allDone = purchased === total;
  return (
    <View style={styles.progressHeader}>
      <MaterialCommunityIcons
        name={allDone ? 'check-circle' : 'cart-outline'}
        size={18}
        color={allDone ? WarmHearthColors.success : WarmHearthColors.shoppingList}
      />
      <Text variant="labelLarge" style={[styles.progressText, allDone && styles.progressDone]}>
        {allDone ? 'All purchased!' : `${purchased} of ${total} purchased`}
      </Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="labelMedium" style={styles.sectionLabel}>{title}</Text>
    </View>
  );
}

function ClearConfirmDialog(
  { visible, count, onDismiss, onConfirm }:
  { count: number; onConfirm: () => void; onDismiss: () => void; visible: boolean },
) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title style={dialogStyles.title}>Move to cupboard?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={dialogStyles.text}>
            {`This will add ${count} purchased item${count !== 1 ? 's' : ''} to your cupboard and remove them from this list.`}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={onConfirm} textColor={WarmHearthColors.shoppingList}>Move to cupboard</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const dialogStyles = StyleSheet.create({
  title: { fontFamily: 'Nunito_700Bold' },
  text: { fontFamily: 'Nunito_400Regular' },
});

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="format-list-bulleted" size={48} color={WarmHearthColors.outline} />
      <Text variant="bodyLarge" style={styles.emptyTitle}>Your shopping list is empty</Text>
      <Text variant="bodyMedium" style={styles.emptyBody}>
        {'Add items above, or hold the mic button below to speak your list.'}
      </Text>
    </View>
  );
}

function ListActions() {
  const db = useDatabase();
  const items = useShoppingListStore(s => s.items);
  const checkAll = useShoppingListStore(s => s.checkAll);
  const uncheckAll = useShoppingListStore(s => s.uncheckAll);
  const clearChecked = useShoppingListStore(s => s.clearChecked);
  const [confirmVisible, setConfirmVisible] = useState(false);

  async function moveToInventory(checkedItems: { name: string; quantity: string }[]) {
    await db.write(async () => {
      for (const item of checkedItems) {
        const match = item.quantity.match(/^([\d.]+)\s*(.*)$/);
        const qty = match ? parseFloat(match[1]) : null;
        const unit = match && match[2] ? match[2].trim() : null;
        await db.get<InventoryItem>('inventory_items').create((inv) => {
          inv.name = item.name;
          inv.quantity = qty;
          inv.unit = unit;
          inv.location = 'cupboard';
          inv.expiryType = null;
          inv.expiryDate = null;
          inv.barcode = null;
          inv.category = null;
          inv.notes = null;
          inv.isDeleted = false;
          inv.updatedAt = new Date();
        });
      }
    });
  }

  const checkedCount = items.filter(i => i.checked).length;
  const allChecked = items.length > 0 && checkedCount === items.length;

  if (items.length === 0) return null;

  return (
    <View style={styles.actionsRow}>
      <Button
        mode="text"
        icon={allChecked ? 'checkbox-blank-outline' : 'check-all'}
        onPress={allChecked ? uncheckAll : checkAll}
        labelStyle={styles.actionLabel}
        textColor={WarmHearthColors.textSecondary}
        compact
      >
        {allChecked ? 'Uncheck all' : 'Check all'}
      </Button>
      {checkedCount > 0 && (
        <>
          <Button
            mode="text"
            icon="delete-sweep-outline"
            onPress={() => setConfirmVisible(true)}
            labelStyle={styles.actionLabel}
            textColor={WarmHearthColors.shoppingList}
            compact
          >
            {`Move to cupboard (${checkedCount})`}
          </Button>
          <ClearConfirmDialog
            visible={confirmVisible}
            count={checkedCount}
            onDismiss={() => setConfirmVisible(false)}
            onConfirm={async () => { const checked = items.filter(i => i.checked); await moveToInventory(checked); clearChecked(); setConfirmVisible(false); }}
          />
        </>
      )}
    </View>
  );
}

type VoiceState = 'idle' | 'recording' | 'processing';

export default function ShoppingListScreen() {
  const items = useShoppingListStore(s => s.items);
  const addItem = useShoppingListStore(s => s.addItem);
  const tipSeen = useOnboardingStore(s => s.shoppingTipSeen);
  const dismissTip = useOnboardingStore(s => s.dismissTip);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [receiptVisible, setReceiptVisible] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startTimeRef = useRef<number>(0);

  async function handleMicPressIn() {
    try {
      const rec = await startVoiceRecording();
      recordingRef.current = rec;
      startTimeRef.current = Date.now();
      setVoiceState('recording');
    } catch (e) {
      console.error('[ShoppingMic] Start error:', e);
      setVoiceState('idle');
    }
  }

  async function handleMicPressOut() {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;

    const heldMs = Date.now() - startTimeRef.current;
    if (heldMs < 600) {
      try { await rec.stopAndUnloadAsync(); } catch {}
      setVoiceState('idle');
      return;
    }

    try {
      setVoiceState('processing');
      const transcript = await stopAndTranscribe(rec);
      console.log('[ShoppingMic] Transcript:', transcript);
      const parsed = await parseShoppingVoice(transcript);
      parsed.forEach(item => addItem(item.name, item.qty));
      setVoiceState('idle');
    } catch (e) {
      console.error('[ShoppingMic] Error:', e);
      setVoiceState('idle');
    }
  }

  const { sections, purchasedCount } = useMemo(() => {
    const pending = items.filter(i => !i.checked).sort((a, b) => a.createdAt - b.createdAt);
    const purchased = items.filter(i => i.checked).sort((a, b) => a.createdAt - b.createdAt);
    const result = [];
    if (pending.length > 0) result.push({ title: 'To buy', data: pending });
    if (purchased.length > 0) result.push({ title: 'Purchased', data: purchased });
    return { sections: result, purchasedCount: purchased.length };
  }, [items]);

  const micBgColor =
    voiceState === 'recording' ? '#B03A2E' :
    voiceState === 'processing' ? WarmHearthColors.outline :
    WarmHearthColors.shoppingList;

  return (
    <View style={styles.container}>
      {!tipSeen && (
        <FeatureTip
          icon="cart-outline"
          title="Your shopping list"
          body={'Add items by typing above, speaking below, or scanning a receipt with the 📄 icon.'}
          onDismiss={() => dismissTip('shoppingTipSeen')}
        />
      )}

      <AddItemInput onScanReceipt={() => setReceiptVisible(true)} />
      <Divider />
      <ProgressHeader total={items.length} purchased={purchasedCount} />

      {items.length === 0
        ? <EmptyState />
        : (
          <>
            <ListActions />
            <SectionList
              sections={sections}
              keyExtractor={i => i.id}
              renderItem={({ item }) => <ShoppingListItemRow item={item} />}
              renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
              contentContainerStyle={styles.list}
              stickySectionHeadersEnabled={false}
            />
          </>
        )}

      {/* Large dictaphone-style mic at bottom — box-none lets touches pass through the transparent area */}
      <View style={styles.micContainer} pointerEvents="box-none">
        <Text variant="bodySmall" style={styles.micHint}>
          {voiceState === 'idle' ? 'Hold to speak your list' :
           voiceState === 'recording' ? 'Listening…' : 'Adding items…'}
        </Text>
        <Pressable
          onPressIn={handleMicPressIn}
          onPressOut={handleMicPressOut}
          disabled={voiceState === 'processing'}
          style={[styles.micButton, { backgroundColor: micBgColor }]}
          accessibilityLabel="Hold to add shopping items by voice"
          accessibilityRole="button"
        >
          {voiceState === 'processing'
            ? <ActivityIndicator size="large" color="#FFFFFF" />
            : <MaterialCommunityIcons
                name={voiceState === 'recording' ? 'microphone' : 'microphone-outline'}
                size={36}
                color="#FFFFFF"
              />
          }
        </Pressable>
      </View>

      <ReceiptScannerModal
        visible={receiptVisible}
        onDismiss={() => setReceiptVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WarmHearthColors.background,
    flex: 1,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  progressText: {
    color: WarmHearthColors.shoppingList,
    fontFamily: 'Nunito_600SemiBold',
  },
  progressDone: {
    color: WarmHearthColors.success,
  },
  sectionHeader: {
    backgroundColor: WarmHearthColors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase',
  },
  list: {
    paddingBottom: 220,
  },
  actionsRow: {
    borderTopColor: WarmHearthColors.outline,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  actionLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 120,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  emptyBody: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
  micContainer: {
    alignItems: 'center',
    bottom: 90,
    elevation: 10,
    gap: 6,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 10,
  },
  micHint: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  micButton: {
    alignItems: 'center',
    borderRadius: 44,
    elevation: 6,
    height: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    width: 80,
  },
});
