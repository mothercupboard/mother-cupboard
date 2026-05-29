import { Stack } from 'expo-router';

export default function SettingsLayout() {
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
      <Stack.Screen name="staples" options={{ title: 'Kitchen Staples' }} />
    </Stack>
  );
}
