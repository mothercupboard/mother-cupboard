import type { TrialStatus } from '@/features/auth/trial-store';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';

type FeatureRowProps = { icon: string; title: string; description: string };

function FeatureRow({ icon, title, description }: FeatureRowProps) {
  return (
    <View style={styles.featureRow}>
      <MaterialCommunityIcons name={icon as 'check'} size={24} color={WarmHearthColors.primary} />
      <View style={styles.featureText}>
        <Text variant="bodyLarge" style={styles.featureTitle}>{title}</Text>
        <Text variant="bodySmall" style={styles.featureDesc}>{description}</Text>
      </View>
    </View>
  );
}

const FEATURES: FeatureRowProps[] = [
  {
    icon: 'bell-ring-outline',
    title: 'Expiry alerts',
    description: 'Get reminders before items reach their dates',
  },
  {
    icon: 'lightbulb-on-outline',
    title: 'Mother Cupboard meal ideas',
    description: 'Personalised recipes based on what you actually have',
  },
  {
    icon: 'cart-outline',
    title: 'Smart shopping list',
    description: 'Auto-populated from recipes, always at your fingertips',
  },
  {
    icon: 'cloud-sync-outline',
    title: 'Cloud sync',
    description: 'Your cupboard, backed up and available everywhere',
  },
];

type Props = {
  trial: TrialStatus;
  visible: boolean;
  onDismiss: () => void;
  onUpgrade: () => void;
};

function PromptHeader({ trial }: { trial: TrialStatus }) {
  if (trial.state === 'expired') {
    return (
      <>
        <MaterialCommunityIcons name="heart-outline" size={40} color={WarmHearthColors.primary} />
        <Text variant="headlineSmall" style={styles.headline}>
          {'You\u2019ve been great at planning meals'}
        </Text>
        <Text variant="bodyMedium" style={styles.subline}>
          Your free trial has ended, but your data is safe. Upgrade to keep all features unlocked.
        </Text>
      </>
    );
  }

  return (
    <>
      <MaterialCommunityIcons name="clock-alert-outline" size={40} color={WarmHearthColors.expiryWarning} />
      <Text variant="headlineSmall" style={styles.headline}>
        Your trial ends soon
      </Text>
      <Text variant="bodyMedium" style={styles.subline}>
        {'You have '}
        {'daysRemaining' in trial ? trial.daysRemaining : 0}
        {' day'}
        {'daysRemaining' in trial && trial.daysRemaining !== 1 ? 's' : ''}
        {' left. Upgrade now to keep everything working seamlessly.'}
      </Text>
    </>
  );
}

/**
 * Full-screen conversion modal shown when the user's trial is expired
 * or about to expire. Highlights key features and offers upgrade / dismiss.
 */
export function ConversionPrompt({ trial, visible, onDismiss, onUpgrade }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <PromptHeader trial={trial} />
        </View>

        <View style={styles.featureList}>
          <Text variant="titleSmall" style={styles.featureListTitle}>
            {'What you\u2019ll keep with a subscription:'}
          </Text>
          {FEATURES.map(f => (
            <FeatureRow key={f.title} {...f} />
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={onUpgrade}
            icon="rocket-launch-outline"
            style={styles.upgradeButton}
            labelStyle={styles.upgradeLabel}
          >
            View plans & upgrade
          </Button>
          <Button
            mode="text"
            onPress={onDismiss}
            labelStyle={styles.dismissLabel}
            compact
          >
            {trial.state === 'expired' ? 'Not now' : 'Remind me later'}
          </Button>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WarmHearthColors.background,
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  header: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  headline: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_800ExtraBold',
    textAlign: 'center',
  },
  subline: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
    textAlign: 'center',
  },
  featureList: {
    gap: 16,
    marginBottom: 32,
  },
  featureListTitle: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  featureDesc: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
  actions: {
    alignItems: 'center',
    gap: 8,
    marginTop: 'auto',
  },
  upgradeButton: {
    borderRadius: 12,
    width: '100%',
  },
  upgradeLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  dismissLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
  },
});
