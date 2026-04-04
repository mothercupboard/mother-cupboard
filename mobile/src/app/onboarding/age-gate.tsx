import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';

export default function AgeGateScreen() {
  const [showBlock, setShowBlock] = useState(false);
  const acceptAgeGate = useOnboardingStore(s => s.acceptAgeGate);

  function handleConfirm() {
    acceptAgeGate();
    router.replace('/onboarding/privacy-disclosure');
  }

  function handleDeny() {
    setShowBlock(true);
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="displaySmall" style={styles.heading}>
          Before we start
        </Text>

        <Text variant="bodyLarge" style={styles.subtext}>
          You need to be 13 or older to use Mother Cupboard.
        </Text>

        {showBlock
          ? (
              <View style={styles.blockCard}>
                <Text variant="bodyLarge" style={styles.blockText}>
                  Mother Cupboard is for users aged 13 and over. Come back when
                  you're older!
                </Text>
              </View>
            )
          : (
              <View style={styles.buttons}>
                <Button
                  mode="contained"
                  onPress={handleConfirm}
                  style={styles.primaryButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  accessibilityLabel="Confirm I am 13 or older"
                  accessibilityRole="button"
                >
                  Yes, I'm 13 or older
                </Button>

                <Button
                  mode="outlined"
                  onPress={handleDeny}
                  style={styles.secondaryButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.outlineButtonLabel}
                  accessibilityLabel="I am under 13"
                  accessibilityRole="button"
                >
                  No, I'm under 13
                </Button>
              </View>
            )}
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
    gap: 24,
  },
  heading: {
    fontFamily: 'Nunito_800ExtraBold',
    color: WarmHearthColors.textPrimary,
  },
  subtext: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
    lineHeight: 26,
  },
  buttons: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    borderRadius: 12,
  },
  secondaryButton: {
    borderRadius: 12,
    borderColor: WarmHearthColors.primary,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  buttonLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  outlineButtonLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: WarmHearthColors.primary,
  },
  blockCard: {
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    shadowColor: WarmHearthColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  blockText: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textPrimary,
    lineHeight: 26,
    textAlign: 'center',
  },
});
