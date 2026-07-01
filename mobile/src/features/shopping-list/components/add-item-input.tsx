import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { IconButton } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useShoppingListStore } from '@/features/shopping-list/shopping-list-store';

type Props = {
  onScanReceipt?: () => void;
};

export function AddItemInput({ onScanReceipt }: Props) {
  const [text, setText] = useState('');
  const addItem = useShoppingListStore(s => s.addItem);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed)
      return;
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx > 0) {
      addItem(trimmed.slice(0, commaIdx).trim(), trimmed.slice(commaIdx + 1).trim());
    }
    else {
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
