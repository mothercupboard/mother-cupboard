import { Stack, router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useTheme } from 'react-native-paper';





function CancelButton() {
  return (
    <Pressable
      onPress={() => router.replace('/(tabs)/inventory')}
      style={({ pressed }) => ({
        backgroundColor: pressed ? 'rgba(255,255,255,0.8)' : '#FFFFFF',
        borderRadius: 8,
        marginRight: 8,
        paddingHorizontal: 14,
        paddingVertical: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      })}
      accessibilityRole="button"
      accessibilityLabel="Cancel"
    >
      <Text style={{ color: '#C05628', fontFamily: 'Nunito_600SemiBold', fontSize: 14 }}>
        Cancel
      </Text>
    </Pressable>
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

