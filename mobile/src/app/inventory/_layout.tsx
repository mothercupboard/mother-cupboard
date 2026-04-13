import { Stack, router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from 'react-native-paper';

function CancelButton() {
  return (
    <Pressable
      onPress={() => router.replace('/(tabs)/inventory')}
      style={({ pressed }) => [cancelStyles.btn, pressed && cancelStyles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Cancel"
      hitSlop={8}
    >
      <Text style={cancelStyles.label}>Cancel</Text>
    </Pressable>
  );
}

const cancelStyles = StyleSheet.create({
  btn: {
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pressed: { opacity: 0.6 },
  label: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
  },
});

export default function InventoryLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'Nunito_700Bold' },
      }}
    >
      <Stack.Screen name="scan"      options={{ title: 'Scan Barcode',    headerRight: () => <CancelButton /> }} />
      <Stack.Screen name="search"    options={{ title: 'Search by Name',  headerRight: () => <CancelButton /> }} />
      <Stack.Screen name="add-item"  options={{ title: 'Add Item',        headerRight: () => <CancelButton /> }} />
      <Stack.Screen name="edit-item" options={{ title: 'Edit Item',       headerRight: () => <CancelButton /> }} />
    </Stack>
  );
}
