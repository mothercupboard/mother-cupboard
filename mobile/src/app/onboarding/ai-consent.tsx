import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useAuthStore } from '@/features/auth/auth-store';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { PRIVACY_POLICY_URL } from '@/lib/legal';

type AIFeatureRowProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  title: string;
  detail: string;
  provider: string;
};

function AIFeatureRow({ icon, iconColor, title, detail, provider }: AIFeatureRowProps) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.iconBadge, { backgroundColor: `${iconColor}18` }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.featureText}>
        <Text variant="labelLarge" style={styles.featureTitle}>{title}</Text>
        <Text variant="bodySmall" style={styles.featureDetail}>{detail}</Text>
        <Text variant="labelSmall" style={[styles.providerBadge, { color: iconColor }]}>
          {provider}
        </Text>
      </View>
    </View>
  );
}

export default function AIConsentScreen() {
  const acceptAIConsent = useOnboardingStore(s => s.acceptAIConsent);
  const session = useAuthStore(s => s.session);
  const insets = useSafeAreaInsets();

  function handleAccept() {
    acceptAIConsent();
    if (session) {
      router.replace('/(tabs)/inventory');
    }
    else {
      router.replace('/(auth)/login');
    }
  }

  function handlePrivacyPolicy() {
    Linking.openURL(PRIVACY_POLICY_URL);
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroRow}>
          <MaterialCommunityIcons name="robot-happy-outline" size={40} color={WarmHearthColors.primary} />
        </View>

        <Text variant="headlineMedium" style={styles.heading}>
          AI & Your Privacy
        </Text>
        <Text variant="bodyMedium" style={styles.subheading}>
          Mother Cupboard uses AI to make your experience smarter. Here's exactly what's used and how your data is handled.
        </Text>

        <View style={styles.card}>
          <AIFeatureRow
            icon="microphone-outline"
            iconColor={WarmHearthColors.primary}
            title="Voice input"
            detail="Your speech is transcribed to text so you can add items hands-free. Audio is processed on OpenAI's servers and is not stored."
            provider="OpenAI Whisper"
          />

          <View style={styles.divider} />

          <AIFeatureRow
            icon="camera-plus-outline"
            iconColor="#5C6BC0"
            title="Photo scanning"
            detail="Photos of your shelves, receipts, shopping lists, or supermarket-app screenshots are read to extract food items automatically. Images are processed on OpenAI's servers and are not stored."
            provider="OpenAI GPT-4o"
          />

          <View style={styles.divider} />

          <AIFeatureRow
            icon="chef-hat"
            iconColor={WarmHearthColors.adventurous}
            title="Meal suggestions"
            detail="Your inventory — item names, quantities, and expiry dates — is sent to generate personalised recipe ideas. No personal or account details are included."
            provider="AWS (Amazon Web Services)"
          />
        </View>

        <View style={styles.noteBox}>
          <MaterialCommunityIcons name="shield-check-outline" size={18} color={WarmHearthColors.textSecondary} />
          <Text variant="bodySmall" style={styles.noteText}>
            We never share your name, email, or account details with any AI provider — only the food data needed to power each feature.
          </Text>
        </View>

        <Button
          mode="text"
          onPress={handlePrivacyPolicy}
          labelStyle={styles.policyLink}
          compact
        >
          Read our full Privacy Policy
        </Button>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleAccept}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          accessibilityLabel="I understand how AI is used — continue"
          accessibilityRole="button"
        >
          I understand, let's continue
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WarmHearthColors.background,
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 16,
  },
  heroRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  heading: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  subheading: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 16,
    elevation: 2,
    gap: 0,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: WarmHearthColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  featureRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  featureText: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  featureDetail: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
  providerBadge: {
    fontFamily: 'Nunito_600SemiBold',
    marginTop: 2,
  },
  divider: {
    backgroundColor: WarmHearthColors.outline,
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
  },
  noteBox: {
    alignItems: 'flex-start',
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  noteText: {
    color: WarmHearthColors.textSecondary,
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
  policyLink: {
    color: WarmHearthColors.primary,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
  footer: {
    borderTopColor: WarmHearthColors.outline,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingTop: 16,
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
});
