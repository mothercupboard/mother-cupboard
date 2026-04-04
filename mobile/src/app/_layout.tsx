import {
  Nunito_400Regular,
  Nunito_400Regular_Italic,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import * as Sentry from '@sentry/react-native';
import { Slot, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WarmHearthTheme } from '@/components/common/paper-theme';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enabled: !__DEV__, // Disable in dev to avoid noise; enable for preview/production
  tracesSampleRate: 0.2, // 20% of transactions for performance monitoring
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const ageGateAccepted = useOnboardingStore(s => s.ageGateAccepted);
  const privacyDisclosureAccepted = useOnboardingStore(s => s.privacyDisclosureAccepted);
  const hasNavigatedRef = useRef(false);

  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_400Regular_Italic,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Initial route guard — runs once after fonts load
  useEffect(() => {
    if (!fontsLoaded && !fontError)
      return;
    if (hasNavigatedRef.current)
      return;
    hasNavigatedRef.current = true;

    if (!ageGateAccepted) {
      router.replace('/onboarding/age-gate');
    }
    else if (!privacyDisclosureAccepted) {
      router.replace('/onboarding/privacy-disclosure');
    }
  }, [fontsLoaded, fontError, ageGateAccepted, privacyDisclosureAccepted, router]);

  if (!fontsLoaded && !fontError)
    return null;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={WarmHearthTheme}>
        <Slot />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
