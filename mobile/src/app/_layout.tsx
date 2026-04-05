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
import { useEffect, useRef, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WarmHearthTheme } from '@/components/common/paper-theme';
import { useAuthStore } from '@/features/auth/auth-store';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { supabase } from '@/lib/supabase/client';

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
  const session = useAuthStore(s => s.session);
  const setSession = useAuthStore(s => s.setSession);
  const hasNavigatedRef = useRef(false);
  const [sessionChecked, setSessionChecked] = useState(false);

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

  // Restore persisted session and keep store in sync with Supabase auth events
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session)
        setSession(data.session);
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  // Route guard — runs once when fonts + session check both complete
  useEffect(() => {
    if (!fontsLoaded && !fontError)
      return;
    if (!sessionChecked)
      return;
    if (hasNavigatedRef.current)
      return;
    hasNavigatedRef.current = true;

    if (session)
      return; // Already authenticated — default route (tabs) renders
    if (!ageGateAccepted) {
      router.replace('/onboarding/age-gate');
      return;
    }
    if (!privacyDisclosureAccepted) {
      router.replace('/onboarding/privacy-disclosure');
      return;
    }
    router.replace('/(auth)/login');
  }, [fontsLoaded, fontError, sessionChecked, session, ageGateAccepted, privacyDisclosureAccepted, router]);

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
