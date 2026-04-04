import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';

export default function PrivacyDisclosureScreen() {
  const acceptPrivacyDisclosure = useOnboardingStore(s => s.acceptPrivacyDisclosure);

  function handleAccept() {
    acceptPrivacyDisclosure();
    router.replace('/(auth)/register');
  }

  function handleBack() {
    router.back();
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.heading}>
          Your data & privacy
        </Text>

        <View style={styles.disclosureCard}>
          <Text variant="bodyLarge" style={styles.bodyText}>
            When you use AI meal suggestions, ingredient details — names,
            quantities, and expiry information — from your inventory are sent to
            a third-party AI provider to generate your suggestions.
          </Text>

          <Text variant="bodyLarge" style={[styles.bodyText, styles.bodySpacing]}>
            We never share your personal details. Only what's in your cupboard.
          </Text>
        </View>

        <Text variant="bodySmall" style={styles.policyNote}>
          You can read our full Privacy Policy at any time in Settings.
        </Text>

        <View style={styles.buttons}>
          <Button
            mode="contained"
            onPress={handleAccept}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            accessibilityLabel="I understand and agree to the privacy disclosure"
            accessibilityRole="button"
          >
            I understand and agree
          </Button>

          <Button
            mode="text"
            onPress={handleBack}
            labelStyle={styles.backLabel}
            accessibilityLabel="Go back to age confirmation"
            accessibilityRole="button"
          >
            Go back
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WarmHearthColors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    gap: 20,
  },
  heading: {
    fontFamily: 'Nunito_700Bold',
    color: WarmHearthColors.textPrimary,
  },
  disclosureCard: {
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 12,
    padding: 20,
    shadowColor: WarmHearthColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  bodyText: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textPrimary,
    lineHeight: 26,
  },
  bodySpacing: {
    marginTop: 12,
  },
  policyNote: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
    fontStyle: 'italic',
  },
  buttons: {
    gap: 8,
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  buttonLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  backLabel: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
  },
});
