import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { RegisterForm } from '@/features/auth/components/register-form';
import { useGuestStore } from '@/features/guest/guest-store';

export default function RegisterScreen() {
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
        Create your account
      </Text>

      <Text variant="bodyMedium" style={styles.subtext}>
        Your inventory will be saved to your account and accessible on any device.
      </Text>

      <RegisterForm />

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
