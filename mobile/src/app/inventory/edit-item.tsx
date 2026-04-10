import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { EditItemForm } from '@/features/inventory/components/edit-item-form';
import { useInventoryItem } from '@/features/inventory/use-inventory-item';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useInventoryItem(id!);

  if (!item) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={WarmHearthColors.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>Loading item…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EditItemForm item={item} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: WarmHearthColors.background, flex: 1 },
  loading: {
    alignItems: 'center',
    backgroundColor: WarmHearthColors.background,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
});
