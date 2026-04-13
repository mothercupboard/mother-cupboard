/**
 * Cancel button v3 — complete rewrite using TouchableOpacity (not Pressable, not Paper Button).
 * Hardcodes the purple header colour so it's not dependent on theme.
 * Defines cancelBtn inline so React Navigation can't intercept the component.
 *
 * Run from: C:\Users\mandr\dev\mother-cupboard\mobile\
 */
const fs = require('fs');

const file = 'src/app/inventory/_layout.tsx';
const content = `import { Stack, router } from 'expo-router';
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
      <Stack.Screen name="scan"      options={{ title: 'Scan Barcode',   headerRight: () => cancelBtn }} />
      <Stack.Screen name="search"    options={{ title: 'Search by Name', headerRight: () => cancelBtn }} />
      <Stack.Screen name="add-item"  options={{ title: 'Add Item',       headerRight: () => cancelBtn }} />
      <Stack.Screen name="edit-item" options={{ title: 'Edit Item',      headerRight: () => cancelBtn }} />
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
`;

fs.writeFileSync(file, content, 'utf8');
console.log('✓ _layout.tsx: Cancel v3 — TouchableOpacity, no theme dependency, hardcoded white text');
console.log('\\nNow run: npx tsc --noEmit 2>&1 | Select-Object -First 10');
