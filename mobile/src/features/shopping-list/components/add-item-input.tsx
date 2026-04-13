import { useState } from 'react';
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
