import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { LoginForm } from '@/features/auth/components/login-form';
import { useGuestStore } from '@/features/guest/guest-store';

export default function LoginScreen() {
  const startGuestSession = useGuestStore(s => s.startGuestSession);

  function handleContinueAsGuest() {
    startGuestSession();
    router.replace('/(tabs)');
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="headlineMedium" style={styles.heading}>
        Welcome back
      </Text>

      <Text variant="bodyMedium" style={styles.subtext}>
        Sign in to access your inventory.
      </Text>

      <LoginForm />

      <Text
        variant="bodyMedium"
        style={styles.forgotLink}
        onPress={() => router.push('/(auth)/forgot-password')}
        accessibilityRole="link"
      >
        Forgot your password?
      </Text>

      <Text
        variant="bodyMedium"
        style={styles.registerLink}
        onPress={() => router.replace('/(auth)/register')}
        accessibilityRole="link"
      >
        {'Don\'t have an account? '}
        <Text style={styles.registerLinkBold}>Create one</Text>
      </Text>

      <Text
        variant="bodySmall"
        style={styles.guestLink}
        onPress={handleContinueAsGuest}
        accessibilityRole="link"
        accessibilityLabel="Continue as guest — 7-day free trial, no account needed"
      >
        Continue as guest
        {' '}
        <Text style={styles.guestLinkMuted}>(7-day free trial)</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: WarmHearthColors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  heading: {
    fontFamily: 'Nunito_700Bold',
    color: WarmHearthColors.textPrimary,
  },
  subtext: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
  },
  forgotLink: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.primary,
    textAlign: 'center',
  },
  registerLink: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  registerLinkBold: {
    fontFamily: 'Nunito_700Bold',
    color: WarmHearthColors.primary,
  },
  guestLink: {
    fontFamily: 'Nunito_600SemiBold',
    color: WarmHearthColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  guestLinkMuted: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.outline,
  },
});
