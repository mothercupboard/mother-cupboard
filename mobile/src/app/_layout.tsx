import {
  Nunito_400Regular,
  Nunito_400Regular_Italic,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import * as Sentry from '@sentry/react-native';
import * as Linking from 'expo-linking';
import { Slot, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WarmHearthTheme } from '@/components/common/paper-theme';
import { useAuthStore } from '@/features/auth/auth-store';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { DatabaseProvider } from '@/lib/database/provider';
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
  const isResetLinkRef = useRef(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [urlChecked, setUrlChecked] = useState(false);

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

  // Check the initial URL — if the app was opened by a password-reset deep link,
  // skip the login redirect so Expo Router can route to /(auth)/reset-password
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        const { path } = Linking.parse(url);
        if (path === 'reset-password')
          isResetLinkRef.current = true;
      }
      setUrlChecked(true);
    });
  }, []);

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

  // Route guard — runs once when fonts + session + URL checks all complete
  useEffect(() => {
    if (!fontsLoaded && !fontError)
      return;
    if (!sessionChecked)
      return;
    if (!urlChecked)
      return;
    if (hasNavigatedRef.current)
      return;
    hasNavigatedRef.current = true;

    if (session)
      return; // Authenticated — default route (tabs) renders
    if (isResetLinkRef.current)
      return; // Password-reset deep link — Expo Router handles routing
    if (!ageGateAccepted) {
      router.replace('/onboarding/age-gate');
      return;
    }
    if (!privacyDisclosureAccepted) {
      router.replace('/onboarding/privacy-disclosure');
      return;
    }
    router.replace('/(auth)/login');
  }, [fontsLoaded, fontError, sessionChecked, urlChecked, session, ageGateAccepted, privacyDisclosureAccepted, router]);

  if (!fontsLoaded && !fontError)
    return null;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={WarmHearthTheme}>
        <DatabaseProvider>
          <Slot />
        </DatabaseProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
