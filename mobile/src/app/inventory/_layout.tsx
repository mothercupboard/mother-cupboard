import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

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
      <Stack.Screen name="scan" options={{ title: 'Scan Barcode' }} />
      <Stack.Screen name="search" options={{ title: 'Search by Name' }} />
      <Stack.Screen name="add-item" options={{ title: 'Add Item' }} />
    </Stack>
  );
}
