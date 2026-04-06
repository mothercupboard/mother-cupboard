import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { AddItemForm } from '@/features/inventory/components/add-item-form';

export default function AddItemScreen() {
  const { barcode, name, category, notFound, manual } = useLocalSearchParams<{
    barcode?: string;
    category?: string;
    manual?: string;
    name?: string;
    notFound?: string;
  }>();

  return (
    <View style={styles.container}>
      {notFound === '1' && (
        <View style={styles.fallbackBanner}>
          <Icon source="barcode-off" size={18} color={WarmHearthColors.textSecondary} />
          <Text variant="bodyMedium" style={styles.fallbackText}>
            We couldn't find this one — fill in the details below.
          </Text>
        </View>
      )}
      <AddItemForm
        barcode={barcode ?? null}
        initialName={name ?? ''}
        category={category ?? null}
        requireExpiry={manual === '1'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: WarmHearthColors.background, flex: 1 },
  fallbackBanner: {
    alignItems: 'center',
    backgroundColor: WarmHearthColors.surface,
    borderBottomColor: WarmHearthColors.outline,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fallbackText: {
    color: WarmHearthColors.textSecondary,
    flex: 1,
    fontFamily: 'Nunito_400Regular',
  },
});
