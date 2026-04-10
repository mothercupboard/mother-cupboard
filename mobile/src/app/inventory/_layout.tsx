import { Stack, router } from 'expo-router';
import { Button, useTheme } from 'react-native-paper';





function CancelButton() {
  return (
    <Button
      compact
      mode="outlined"
      onPress={() => router.replace('/(tabs)/inventory')}
      textColor="#FFFFFF"
      style={{ borderColor: 'rgba(255,255,255,0.85)', marginRight: 4 }}
      labelStyle={{ fontFamily: 'Nunito_600SemiBold', fontSize: 14 }}
    >
      Cancel
    </Button>
  );
}

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
      <Stack.Screen name="scan" options={{ title: 'Scan Barcode', headerRight: () => <CancelButton /> }} />
      <Stack.Screen name="search" options={{ title: 'Search by Name', headerRight: () => <CancelButton /> }} />
      <Stack.Screen name="add-item" options={{ title: 'Add Item', headerRight: () => <CancelButton /> }} />
      <Stack.Screen name="edit-item" options={{ title: 'Edit Item', headerRight: () => <CancelButton /> }} />
    </Stack>
  );
}

