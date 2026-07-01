import { router, Stack } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function InventoryLayout() {
  const cancelBtn = (
    <TouchableOpacity
      onPress={() => router.replace('/(tabs)/inventory')}
      style={styles.btn}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel="Cancel"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.label}>Cancel</Text>
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        // '#7B5EA7' matches WarmHearthColors.primary — keep in sync if theme changes
        headerStyle: { backgroundColor: '#7B5EA7' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'Nunito_700Bold', color: '#FFFFFF' },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="scan" options={{ title: 'Scan Barcode', headerRight: () => cancelBtn }} />
      <Stack.Screen name="search" options={{ title: 'Search by Name', headerRight: () => cancelBtn }} />
      <Stack.Screen name="add-item" options={{ title: 'Add Item', headerRight: () => cancelBtn }} />
      <Stack.Screen name="edit-item" options={{ title: 'Edit Item', headerRight: () => cancelBtn }} />
      <Stack.Screen name="scan-receipt" options={{ title: 'Snap to add', headerRight: () => cancelBtn }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: 'transparent',
    marginRight: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
  },
});
