import type { Database } from '@nozbe/watermelondb';
import type { ExpiryType, InventoryItem, ItemLocation } from '@/lib/database/models/inventory-item';

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, SegmentedButtons, Text } from 'react-native-paper';

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

const EXPIRY_BUTTONS_ALL = [
  { label: 'None', value: '' },
  { label: 'Use by', value: 'use_by' },
  { label: 'Best before', value: 'best_before' },
];

const EXPIRY_BUTTONS_REQUIRED = [
  { label: 'Use by', value: 'use_by' },
  { label: 'Best before', value: 'best_before' },
];

type SaveParams = {
  barcode: string | null;
  category: string | null;
  expiryDate: string;
  expiryType: ExpiryType | '';
  location: ItemLocation;
  name: string;
  quantity: string;
  unit: string;
};

async function saveItem(db: Database, p: SaveParams): Promise<void> {
  const qty = p.quantity ? Number.parseFloat(p.quantity) : null;
  const expMs = p.expiryDate ? parseDateGB(p.expiryDate) : null;
  await db.write(async () => {
    await db.get<InventoryItem>('inventory_items').create((item) => {
      item.name = p.name.trim();
      item.quantity = qty;
      item.unit = qty !== null ? p.unit : null;
      item.location = p.location;
      item.expiryType = p.expiryType || null;
      item.expiryDate = expMs;
      item.barcode = p.barcode;
      item.category = p.category;
      item.notes = null;
      item.isDeleted = false;
      item.updatedAt = new Date();
    });
  });
}

function validateExpiry(requireExpiry: boolean, expiryType: ExpiryType | '', expiryDate: string): string | null {
  if (!requireExpiry)
    return null;
  if (!expiryType)
    return 'Please select an expiry type';
  if (!expiryDate || parseDateGB(expiryDate) === null)
    return 'Please enter a valid expiry date (DD/MM/YYYY)';
  return null;
}

type Props = {
  barcode: string | null;
  category: string | null;
  initialName: string;
  requireExpiry?: boolean;
};

export function AddItemForm({ barcode, initialName, category, requireExpiry = false }: Props) {
  const db = useDatabase();
  const [name, setName] = useState(initialName);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('items');
  const [location, setLocation] = useState<ItemLocation>('fridge');
  const [expiryType, setExpiryType] = useState<ExpiryType | ''>(requireExpiry ? 'use_by' : '');
  const [expiryDate, setExpiryDate] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [expiryError, setExpiryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function handleSubmit() {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    const expiryErr = validateExpiry(requireExpiry, expiryType, expiryDate);
    if (expiryErr) {
      setExpiryError(expiryErr);
      return;
    }
    setNameError(null);
    setExpiryError(null);
    setSubmitting(true);
    try {
      await saveItem(db, { barcode, category, expiryDate, expiryType, location, name, quantity, unit });
      router.replace('/(tabs)/inventory');
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
      <FormTextField
        label="Quantity (optional)"
        value={quantity}
        onChangeText={setQuantity}
        onBlur={() => {}}
        errors={[]}
        isTouched={false}
        keyboardType="numeric"
        accessibilityHint="Enter quantity"
      />
      <Text variant="labelMedium" style={styles.fieldLabel}>Unit</Text>
      <SegmentedButtons
        value={unit}
        onValueChange={v => setUnit(v)}
        buttons={UNIT_BUTTONS}
      />
      <Text variant="labelMedium" style={styles.fieldLabel}>Storage location</Text>
      <SegmentedButtons
        value={location}
        onValueChange={v => setLocation(v as ItemLocation)}
        buttons={LOCATION_BUTTONS}
      />
      <Text variant="labelMedium" style={styles.fieldLabel}>
        {requireExpiry ? 'Expiry type' : 'Expiry type (optional)'}
      </Text>
      <SegmentedButtons
        value={expiryType}
        onValueChange={v => setExpiryType(v as ExpiryType | '')}
        buttons={requireExpiry ? EXPIRY_BUTTONS_REQUIRED : EXPIRY_BUTTONS_ALL}
      />
      {expiryType !== '' && (
        <FormTextField
          label="Expiry date (DD/MM/YYYY)"
          value={expiryDate}
          onChangeText={setExpiryDate}
          onBlur={() => {}}
          errors={expiryDate && parseDateGB(expiryDate) === null ? ['Enter a date as DD/MM/YYYY'] : []}
          isTouched={expiryDate.length > 0}
          keyboardType="numeric"
          accessibilityHint="Enter date as DD/MM/YYYY"
        />
      )}
      {expiryError !== null && (
        <Text variant="bodySmall" style={styles.expiryError}>{expiryError}</Text>
      )}
      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={submitting}
        loading={submitting}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        {submitting ? 'Saving…' : 'Add to inventory'}
      </Button>
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
  expiryError: {
    color: WarmHearthColors.expiryUrgent,
    fontFamily: 'Nunito_400Regular',
  },
  button: { borderRadius: 12, marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
  buttonLabel: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
