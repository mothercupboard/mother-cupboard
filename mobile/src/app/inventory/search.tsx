import type { OffProduct } from '@/lib/barcode/off-database';

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
        placeholder="Type a product name…"
        value={query}
        onChangeText={setQuery}
        style={styles.searchbar}
        autoFocus
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
            No results for "
            {query}
            ".
          </Text>
          <List.Item
            title={`Add "${query}" manually`}
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
