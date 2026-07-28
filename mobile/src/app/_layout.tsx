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
import * as Notifications from 'expo-notifications';
import { Slot, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { PaperProvider } from 'react-native-paper';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WarmHearthTheme } from '@/components/common/paper-theme';
import { useAuthStore } from '@/features/auth/auth-store';
import { isGuestExpired, useGuestStore } from '@/features/guest/guest-store';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { APIProvider } from '@/lib/api/provider';
import { DatabaseProvider } from '@/lib/database/provider';
import { isDeviceRegionConfident } from '@/lib/region';
import { configureRevenueCat, identifyUser } from '@/lib/revenuecat/client';
import { useRevenueCatStore } from '@/lib/revenuecat/store';
import { supabase } from '@/lib/supabase/client';

// Show expiry-alert notifications even while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enabled: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2, // 20% of transactions for performance monitoring
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const ageGateAccepted = useOnboardingStore(s => s.ageGateAccepted);
  const privacyDisclosureAccepted = useOnboardingStore(s => s.privacyDisclosureAccepted);
  const aiConsentAccepted = useOnboardingStore(s => s.aiConsentAccepted);
  const regionConfirmed = useOnboardingStore(s => s.regionConfirmed);
  const isGuest = useGuestStore(s => s.isGuest);
  const guestStartedAt = useGuestStore(s => s.guestStartedAt);
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

  // Check the initial URL â€” if the app was opened by a password-reset deep link,
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
      // Always sync to Supabase's truth — including null. Otherwise a stale
      // persisted session (e.g. a previous account) survives on launch.
      setSession(data.session);
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  // Initialise RevenueCat and sync user identity
  useEffect(() => {
    if (!sessionChecked)
      return;

    configureRevenueCat().then(async () => {
      if (session?.user?.id) {
        await identifyUser(session.user.id);
      }
      useRevenueCatStore.getState().refresh();
    }).catch((err) => {
      console.warn('[RevenueCat] init failed:', err?.message);
    });
  }, [sessionChecked, session?.user?.id]);

  // Route guard â€” runs once when fonts + session + URL checks all complete
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

    if (isResetLinkRef.current)
      return; // Password-reset deep link â€” Expo Router handles routing
    if (!ageGateAccepted) {
      router.replace('/onboarding/age-gate');
      return;
    }
    if (!privacyDisclosureAccepted) {
      router.replace('/onboarding/privacy-disclosure');
      return;
    }
    // AI consent runs for all users — new and existing authenticated alike.
    // This ensures Apple's reviewer sees the in-app AI disclosure on first launch.
    if (!aiConsentAccepted) {
      router.replace('/onboarding/ai-consent');
      return;
    }
    // Region drives supermarkets, currency and offers. Only interrupt when the
    // phone couldn't confidently detect one of our markets; otherwise trust the
    // auto-detected region and mark it confirmed silently (still editable in
    // Settings). This keeps onboarding frictionless for the confident majority.
    if (!regionConfirmed) {
      if (isDeviceRegionConfident()) {
        useOnboardingStore.getState().confirmRegion();
      }
      else {
        router.replace('/onboarding/region');
        return;
      }
    }
    if (session)
      return; // Authenticated â€” default route (tabs) renders
    // Guest with active trial — allow through to tabs (local-only mode)
    if (isGuest && !isGuestExpired(guestStartedAt)) {
      return;
    }
    // Guest whose trial has expired — show expiry screen
    if (isGuest && isGuestExpired(guestStartedAt)) {
      router.replace('/onboarding/guest-expired');
      return;
    }
    router.replace('/(auth)/login');
  }, [fontsLoaded, fontError, sessionChecked, urlChecked, session, ageGateAccepted, privacyDisclosureAccepted, aiConsentAccepted, regionConfirmed, isGuest, guestStartedAt, router]);

  // Navigate to inventory when user taps an expiry-alert notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const category = response.notification.request.content.categoryIdentifier;
      if (category === 'expiry-alert') {
        router.navigate('/(tabs)/inventory');
      }
    });
    return () => sub.remove();
  }, [router]);

  if (!fontsLoaded && !fontError)
    return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <PaperProvider theme={WarmHearthTheme}>
            <APIProvider>
              <DatabaseProvider>
                <Slot />
              </DatabaseProvider>
            </APIProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
