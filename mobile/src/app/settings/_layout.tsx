import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';

function HeaderBackButton() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings'))}
      hitSlop={16}
      accessibilityLabel="Go back"
      accessibilityRole="button"
      style={{ paddingRight: 8 }}
    >
      <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
    </Pressable>
  );
}

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        // '#7B5EA7' matches WarmHearthColors.primary — keep in sync if theme changes
        headerStyle: { backgroundColor: '#7B5EA7' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'Nunito_700Bold', color: '#FFFFFF' },
        headerBackTitle: '',
        // Staples sits at the root of this stack, so iOS draws no back button and
        // there's no hardware back — supply one explicitly so users aren't trapped.
        headerLeft: () => <HeaderBackButton />,
      }}
    >
      <Stack.Screen name="staples" options={{ title: 'Kitchen Staples' }} />
    </Stack>
  );
}
