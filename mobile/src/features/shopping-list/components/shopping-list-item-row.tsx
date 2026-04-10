import type { ShoppingItem } from '@/features/shopping-list/shopping-list-store';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useShoppingListStore } from '@/features/shopping-list/shopping-list-store';

export function ShoppingListItemRow({ item }: { item: ShoppingItem }) {
  const toggleChecked = useShoppingListStore(s => s.toggleChecked);
  const removeItem = useShoppingListStore(s => s.removeItem);

  return (
    <View style={styles.row}>
      <Checkbox
        status={item.checked ? 'checked' : 'unchecked'}
        onPress={() => toggleChecked(item.id)}
        color={WarmHearthColors.shoppingList}
      />

      <Pressable
        style={styles.content}
        onPress={() => toggleChecked(item.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        accessibilityLabel={`${item.name}${item.quantity ? `, ${item.quantity}` : ''}`}
      >
        <Text
          variant="bodyLarge"
          style={[styles.name, item.checked && styles.nameChecked]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.quantity !== '' && (
          <Text variant="bodySmall" style={styles.quantity}>
            {item.quantity}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => removeItem(item.id)}
        hitSlop={16}
        accessibilityLabel={`Remove ${item.name}`}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="close-circle-outline" size={20} color={WarmHearthColors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: WarmHearthColors.outline,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  content: {
    flex: 1,
    gap: 1,
  },
  name: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_400Regular',
  },
  nameChecked: {
    color: WarmHearthColors.textSecondary,
    textDecorationLine: 'line-through',
  },
  quantity: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
});
