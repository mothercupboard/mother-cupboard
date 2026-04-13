/**
 * Replaces RNP TextInput (mode="outlined") with React Native's built-in TextInput.
 * RNP outlined TextInput has a known focus/touch-area misalignment bug on iOS
 * inside Expo Router stack navigators — the keyboard opens but text events don't fire.
 *
 * Affects:
 *   - src/features/shopping-list/components/add-item-input.tsx
 *   - src/components/common/form-text-field.tsx
 *   - src/app/inventory/search.tsx  (Searchbar → RN TextInput)
 *
 * Run from: C:\Users\mandr\dev\mother-cupboard\mobile\
 */
const fs = require('fs');

// ─── 1. SHOPPING LIST INPUT ────────────────────────────────────────────────
{
  const file = 'src/features/shopping-list/components/add-item-input.tsx';
  const content = `import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useShoppingListStore } from '@/features/shopping-list/shopping-list-store';

interface Props {
  onScanReceipt?: () => void;
}

export function AddItemInput({ onScanReceipt }: Props) {
  const [text, setText] = useState('');
  const addItem = useShoppingListStore(s => s.addItem);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx > 0) {
      addItem(trimmed.slice(0, commaIdx).trim(), trimmed.slice(commaIdx + 1).trim());
    } else {
      addItem(trimmed);
    }
    setText('');
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Add item (e.g. Milk, 2 pints)"
        placeholderTextColor={WarmHearthColors.textSecondary}
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        style={styles.input}
        accessibilityLabel="Add shopping list item"
        accessibilityHint="Type item name, optionally followed by comma and quantity"
      />
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={!text.trim()}
        style={[styles.addBtn, !text.trim() && styles.addBtnDisabled]}
        accessibilityLabel="Add item"
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name="plus-circle"
          size={28}
          color={text.trim() ? WarmHearthColors.shoppingList : WarmHearthColors.outline}
        />
      </TouchableOpacity>
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    backgroundColor: WarmHearthColors.surface,
    borderColor: WarmHearthColors.outline,
    borderRadius: 8,
    borderWidth: 1,
    color: WarmHearthColors.textPrimary,
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addBtn: { padding: 4 },
  addBtnDisabled: { opacity: 0.4 },
});
`;
  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ add-item-input.tsx: RNP TextInput → RN TextInput');
}

// ─── 2. FORM TEXT FIELD ────────────────────────────────────────────────────
{
  const file = 'src/components/common/form-text-field.tsx';
  const content = `import { StyleSheet, Text, TextInput, View } from 'react-native';

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
  accessibilityHint,
}: FormTextFieldProps) {
  const hasError = isTouched && errors.length > 0;
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={keyboardType !== 'email-address' && keyboardType !== 'numeric'}
        keyboardType={keyboardType}
        textContentType={textContentType}
        secureTextEntry={secureTextEntry}
        style={[styles.input, hasError && styles.inputError]}
        placeholderTextColor={WarmHearthColors.textSecondary}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
      {hasError && (
        <Text style={styles.errorText}>{String(errors[0])}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  label: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
  input: {
    backgroundColor: WarmHearthColors.surface,
    borderColor: WarmHearthColors.outline,
    borderRadius: 8,
    borderWidth: 1,
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: WarmHearthColors.expiryUrgent,
  },
  errorText: {
    color: WarmHearthColors.expiryUrgent,
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
  },
});
`;
  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ form-text-field.tsx: RNP TextInput → RN TextInput with label above');
}

// ─── 3. SEARCH SCREEN ─────────────────────────────────────────────────────
{
  const file = 'src/app/inventory/search.tsx';
  const content = `import type { OffProduct } from '@/lib/barcode/off-database';

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Divider, List, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
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
      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={20} color={WarmHearthColors.textSecondary} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          placeholder="Type a product name\u2026"
          placeholderTextColor={WarmHearthColors.textSecondary}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search for a product by name"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" size={18} color={WarmHearthColors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

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
  searchRow: {
    alignItems: 'center',
    backgroundColor: WarmHearthColors.surface,
    borderBottomColor: WarmHearthColors.outline,
    borderBottomWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    color: WarmHearthColors.textPrimary,
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    paddingVertical: 8,
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
  console.log('✓ search.tsx: Searchbar → RN TextInput');
}

console.log('\nAll done. Run: npx tsc --noEmit 2>&1 | Select-Object -First 20');
