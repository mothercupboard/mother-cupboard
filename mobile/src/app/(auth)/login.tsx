import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginScreen() {
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
});
