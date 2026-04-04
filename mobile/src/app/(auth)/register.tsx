import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { RegisterForm } from '@/features/auth/components/register-form';

export default function RegisterScreen() {
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
});
