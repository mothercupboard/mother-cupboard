/**
 * Fixes two keyboard issues:
 * 1. Search screen: autoFocus during nav animation loses focus on iOS → use ref + delayed focus
 * 2. All RNP TextInputs: text is typed but invisible (colour blends with surface) → add textColor
 *
 * Run from: C:\Users\mandr\dev\mother-cupboard\mobile\
 */
const fs = require('fs');

// ─── 1. SEARCH SCREEN ──────────────────────────────────────────────────────
{
  const file = 'src/app/inventory/search.tsx';
  const content = `import type { OffProduct } from '@/lib/barcode/off-database';

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Divider, List, Searchbar, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { searchByName } from '@/lib/barcode/off-database';

const DEBOUNCE_MS = 300;

function navigateToItem(product: OffProduct): void {
  router.replace({
    pathname: '/inventory/add-item',
    params: { barcode: product.barcode, category: product.category ?? '', name: product.name },
  });
}

function navigateManual(query: string): void {
  router.replace({ pathname: '/inventory/add-item', params: { name: query.trim() } });
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OffProduct[]>([]);
  const [searched, setSearched] = useState(false);
  const searchbarRef = useRef<any>(null);

  // Focus after navigation animation completes (autoFocus fires too early on iOS)
  useEffect(() => {
    const t = setTimeout(() => searchbarRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      const found = await searchByName(query);
      setResults(found);
      setSearched(true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={styles.container}>
      <Searchbar
        ref={searchbarRef}
        placeholder="Type a product name\u2026"
        value={query}
        onChangeText={setQuery}
        style={styles.searchbar}
        inputStyle={styles.searchbarInput}
        accessibilityLabel="Search for a product by name"
      />

      {query.length < 2 && (
        <View style={styles.centred}>
          <Text variant="bodyMedium" style={styles.hint}>
            Type at least 2 characters to search.
          </Text>
        </View>
      )}

      {query.length >= 2 && searched && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={item => item.barcode}
          ItemSeparatorComponent={Divider}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={item.category ?? undefined}
              onPress={() => navigateToItem(item)}
              titleStyle={styles.resultTitle}
              descriptionStyle={styles.resultCategory}
            />
          )}
        />
      )}

      {query.length >= 2 && searched && results.length === 0 && (
        <View style={styles.centred}>
          <Text variant="bodyMedium" style={styles.hint}>
            {['No results for "', query, '".'].join('')}
          </Text>
          <List.Item
            title={'Add "' + query + '" manually'}
            left={props => <List.Icon {...props} icon="plus-circle-outline" color={WarmHearthColors.primary} />}
            onPress={() => navigateManual(query)}
            titleStyle={styles.addManuallyTitle}
            style={styles.addManuallyRow}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: WarmHearthColors.background, flex: 1 },
  searchbar: {
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 0,
    elevation: 2,
  },
  searchbarInput: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_400Regular',
  },
  centred: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  hint: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
  },
  resultTitle: { color: WarmHearthColors.textPrimary, fontFamily: 'Nunito_600SemiBold' },
  resultCategory: { color: WarmHearthColors.textSecondary, fontFamily: 'Nunito_400Regular' },
  addManuallyTitle: { color: WarmHearthColors.primary, fontFamily: 'Nunito_600SemiBold' },
  addManuallyRow: { marginTop: 12 },
});
`;
  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ search.tsx: removed autoFocus, added ref-based delayed focus + explicit text colour');
}

// ─── 2. FORM TEXT FIELD ────────────────────────────────────────────────────
{
  const file = 'src/components/common/form-text-field.tsx';
  const content = `import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';

export type FormTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  errors: string[];
  isTouched: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  textContentType?: 'emailAddress' | 'newPassword' | 'password';
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
  accessibilityHint: string;
};

export function FormTextField({
  label,
  value,
  onChangeText,
  onBlur,
  errors,
  isTouched,
  keyboardType = 'default',
  textContentType,
  secureTextEntry,
  rightIcon,
  accessibilityHint,
}: FormTextFieldProps) {
  const hasError = isTouched && errors.length > 0;
  return (
    <View>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : undefined}
        autoCorrect={keyboardType === 'email-address' || keyboardType === 'numeric' ? false : undefined}
        keyboardType={keyboardType}
        textContentType={textContentType}
        secureTextEntry={secureTextEntry}
        mode="outlined"
        error={hasError}
        style={styles.input}
        textColor={WarmHearthColors.textPrimary}
        contentStyle={styles.inputContent}
        right={rightIcon}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
      {hasError && (
        <HelperText type="error" visible>
          {String(errors[0])}
        </HelperText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: WarmHearthColors.surface },
  inputContent: { fontFamily: 'Nunito_400Regular', color: WarmHearthColors.textPrimary },
});
`;
  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ form-text-field.tsx: added textColor + contentStyle to make typed text visible');
}

// ─── 3. SHOPPING LIST TEXT INPUT ───────────────────────────────────────────
{
  const file = 'src/features/shopping-list/components/add-item-input.tsx';
  const content = `import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, TextInput } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useShoppingListStore } from '@/features/shopping-list/shopping-list-store';

interface Props {
  onScanReceipt?: () => void;
}

/**
 * Inline input row at the top of the shopping list.
 * The receipt camera icon opens the receipt scanner modal (handled by parent).
 */
export function AddItemInput({ onScanReceipt }: Props) {
  const [text, setText] = useState('');
  const addItem = useShoppingListStore(s => s.addItem);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Support "name, quantity" shorthand
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx > 0) {
      const name = trimmed.slice(0, commaIdx).trim();
      const qty = trimmed.slice(commaIdx + 1).trim();
      addItem(name, qty);
    } else {
      addItem(trimmed);
    }
    setText('');
  }

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        placeholder="Add item (e.g. Milk, 2 pints)"
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        style={styles.input}
        textColor={WarmHearthColors.textPrimary}
        contentStyle={styles.inputContent}
        dense
        accessibilityLabel="Add shopping list item"
        accessibilityHint="Type item name, optionally followed by comma and quantity"
      />
      <IconButton
        icon="plus-circle"
        iconColor={WarmHearthColors.shoppingList}
        size={28}
        onPress={handleSubmit}
        disabled={!text.trim()}
        accessibilityLabel="Add item"
      />
      <IconButton
        icon="receipt"
        iconColor={WarmHearthColors.primary}
        size={26}
        onPress={onScanReceipt}
        accessibilityLabel="Scan shopping receipt"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    backgroundColor: WarmHearthColors.surface,
    flex: 1,
  },
  inputContent: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_400Regular',
  },
});
`;
  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ add-item-input.tsx: added textColor + contentStyle');
}

console.log('\nAll done. Now run:');
console.log('  npx tsc --noEmit 2>&1 | Select-Object -First 20');
