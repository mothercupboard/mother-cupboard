import type { Database } from '@nozbe/watermelondb';
import type { ExpiryType, InventoryItem, ItemLocation } from '@/lib/database/models/inventory-item';

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, SegmentedButtons, Text, TextInput as PaperTextInput } from 'react-native-paper';

import { FormTextField } from '@/components/common/form-text-field';
import { WarmHearthColors } from '@/components/common/paper-theme';
import { parseDateGB } from '@/features/inventory/inventory.utils';
import { useDatabase } from '@/lib/database/provider';

const LOCATION_BUTTONS = [
  { label: 'Fridge', value: 'fridge' },
  { label: 'Freezer', value: 'freezer' },
  { label: 'Cupboard', value: 'cupboard' },
];

const UNIT_BUTTONS = [
  { label: 'g', value: 'g' },
  { label: 'ml', value: 'ml' },
  { label: 'items', value: 'items' },
  { label: 'portions', value: 'portions' },
];

const EXPIRY_BUTTONS = [
  { label: 'None', value: '' },
  { label: 'Use by', value: 'use_by' },
  { label: 'Best before', value: 'best_before' },
];

type EditParams = {
  expiryDate: string;
  expiryType: ExpiryType | '';
  location: ItemLocation;
  name: string;
  quantity: string;
  unit: string;
};

function formatDateGB(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB');
}

function DeleteDialog(
  { visible, itemName, deleting, onDismiss, onConfirm }:
  { deleting: boolean; itemName: string; onConfirm: () => void; onDismiss: () => void; visible: boolean },
) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title style={dialogStyles.title}>Remove item?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={dialogStyles.text}>
            Remove &quot;
            {itemName}
            &quot; from your cupboard? You can always add it again later.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={deleting}>Cancel</Button>
          <Button
            onPress={onConfirm}
            loading={deleting}
            disabled={deleting}
            textColor={WarmHearthColors.expiryUrgent}
          >
            Delete
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const dialogStyles = StyleSheet.create({
  title: { fontFamily: 'Nunito_700Bold' },
  text: { fontFamily: 'Nunito_400Regular' },
});

type ActionProps = {
  del: ReturnType<typeof useDeleteItem>;
  itemName: string;
  onSave: () => void;
  submitting: boolean;
};

function ActionButtons({ del, itemName, onSave, submitting }: ActionProps) {
  return (
    <>
      <Button
        mode="contained"
        onPress={onSave}
        disabled={submitting || del.deleting}
        loading={submitting}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        {submitting ? 'Saving…' : 'Save changes'}
      </Button>

      <View style={styles.deleteSection}>
        <Button
          mode="outlined"
          onPress={del.show}
          disabled={submitting || del.deleting}
          icon="delete-outline"
          textColor={WarmHearthColors.expiryUrgent}
          style={styles.deleteButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.deleteLabel}
        >
          Delete item
        </Button>
      </View>

      <DeleteDialog
        visible={del.visible}
        itemName={itemName}
        deleting={del.deleting}
        onDismiss={del.dismiss}
        onConfirm={del.confirm}
      />
    </>
  );
}

async function updateItem(db: Database, item: InventoryItem, p: EditParams): Promise<void> {
  const qty = p.quantity ? Number.parseFloat(p.quantity) : null;
  const expMs = p.expiryDate ? parseDateGB(p.expiryDate) : null;
  await db.write(async () => {
    await item.update((record) => {
      record.name = p.name.trim();
      record.quantity = qty;
      record.unit = qty !== null ? p.unit : null;
      record.location = p.location;
      record.expiryType = p.expiryType || null;
      record.expiryDate = expMs;
      record.updatedAt = new Date();
    });
  });
}

function useDeleteItem(db: Database, item: InventoryItem) {
  const [visible, setVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    try {
      await db.write(async () => {
        await item.markAsDeleted();
      });
      router.back();
    }
    finally {
      setDeleting(false);
      setVisible(false);
    }
  }

  return { confirm, deleting, dismiss: () => setVisible(false), show: () => setVisible(true), visible };
}

export function EditItemForm({ item }: { item: InventoryItem }) {
  const db = useDatabase();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity !== null ? String(item.quantity) : '');
  const [unit, setUnit] = useState(item.unit ?? 'items');
  const [location, setLocation] = useState<ItemLocation>(item.location);
  const [expiryType, setExpiryType] = useState<ExpiryType | ''>(item.expiryType ?? '');
  const [expiryDate, setExpiryDate] = useState(() => item.expiryDate !== null ? formatDateGB(item.expiryDate) : '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [qtyDialogVisible, setQtyDialogVisible] = useState(false);
  const [qtyDraft, setQtyDraft] = useState(quantity);
  const del = useDeleteItem(db, item);

  async function handleSubmit() {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError(null);
    setSubmitting(true);
    try {
      await updateItem(db, item, { expiryDate, expiryType, location, name, quantity, unit });
      router.back();
    }
    finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <FormTextField
        label="Item name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setNameError(null);
        }}
        onBlur={() => {
          if (!name.trim())
            setNameError('Name is required');
        }}
        errors={nameError ? [nameError] : []}
        isTouched={nameError !== null}
        accessibilityHint="Enter the product name"
      />
      <Pressable onPress={() => { setQtyDraft(quantity); setQtyDialogVisible(true); }}>
        <View pointerEvents="none">
        <PaperTextInput
          label="Quantity (optional)"
          value={quantity}
          mode="outlined"
          editable={false}
          right={<PaperTextInput.Icon icon="pencil" />}
          style={styles.paperInput}
          outlineColor={WarmHearthColors.outline}
          activeOutlineColor={WarmHearthColors.primary}
          theme={{ fonts: { bodyLarge: { fontFamily: 'Nunito_400Regular' } } }}
        />
        </View>
      </Pressable>
      <Portal>
        <Dialog visible={qtyDialogVisible} onDismiss={() => setQtyDialogVisible(false)}>
          <Dialog.Title style={{ fontFamily: 'Nunito_700Bold' }}>Quantity</Dialog.Title>
          <Dialog.Content>
            <PaperTextInput
              label="Enter quantity"
              value={qtyDraft}
              onChangeText={setQtyDraft}
              mode="outlined"
              keyboardType="decimal-pad"
              style={{ backgroundColor: WarmHearthColors.background }}
              theme={{ fonts: { bodyLarge: { fontFamily: 'Nunito_400Regular' } } }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setQtyDialogVisible(false)}>Cancel</Button>
            <Button onPress={() => { setQuantity(qtyDraft); setQtyDialogVisible(false); }}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Text variant="labelMedium" style={styles.fieldLabel}>Unit</Text>
      <SegmentedButtons value={unit} onValueChange={setUnit} buttons={UNIT_BUTTONS} />
      <Text variant="labelMedium" style={styles.fieldLabel}>Storage location</Text>
      <SegmentedButtons
        value={location}
        onValueChange={v => setLocation(v as ItemLocation)}
        buttons={LOCATION_BUTTONS}
      />
      <Text variant="labelMedium" style={styles.fieldLabel}>Expiry type (optional)</Text>
      <SegmentedButtons
        value={expiryType}
        onValueChange={v => setExpiryType(v as ExpiryType | '')}
        buttons={EXPIRY_BUTTONS}
      />
      {expiryType !== '' && (
        <FormTextField
          label="Expiry date (DD/MM/YY)"
          value={expiryDate}
          onChangeText={setExpiryDate}
          onBlur={() => {}}
          errors={expiryDate && parseDateGB(expiryDate) === null ? ['Enter a date as DD/MM/YY'] : []}
          isTouched={expiryDate.length > 0}
          keyboardType="numeric"
          accessibilityHint="Enter date as DD/MM/YY"
        />
      )}
      <ActionButtons del={del} itemName={item.name} onSave={handleSubmit} submitting={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WarmHearthColors.background,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  fieldLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    marginTop: 4,
  },
  paperInput: { backgroundColor: WarmHearthColors.background, fontSize: 15 },
  button: { borderRadius: 12, marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
  buttonLabel: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  deleteSection: {
    borderTopColor: WarmHearthColors.outline,
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 16,
  },
  deleteButton: {
    borderColor: WarmHearthColors.expiryUrgent,
    borderRadius: 12,
  },
  deleteLabel: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
});

