import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';

type Props = {
  /** Feature name shown in the heading (e.g. "AI Meal Suggestions") */
  feature: string;
  /** Short explanation of what this feature does */
  description: string;
  /** Icon name from MaterialCommunityIcons */
  icon: string;
};

/**
 * Full-area gate shown in place of a premium feature when the user is
 * on the free tier. Explains what they're missing and offers upgrade +
 * restore-purchase CTAs.
 */
export function PaywallGate({ feature, description, icon }: Props) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon as 'lock-outline'} size={48} color={WarmHearthColors.outline} />

      <Text variant="titleMedium" style={styles.heading}>
        {feature}
      </Text>
      <Text variant="bodyMedium" style={styles.body}>
        {description}
      </Text>

      <View style={styles.badge}>
        <MaterialCommunityIcons name="crown-outline" size={16} color={WarmHearthColors.primary} />
        <Text variant="labelMedium" style={styles.badgeText}>Premium feature</Text>
      </View>

      <Button
        mode="contained"
        icon="rocket-launch-outline"
        style={styles.upgradeButton}
        labelStyle={styles.upgradeLabel}
      >
        Upgrade to unlock
      </Button>

      <Button
        mode="text"
        icon="restore"
        labelStyle={styles.restoreLabel}
        compact
      >
        Restore purchases
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  heading: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  body: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#FFE8DC',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: WarmHearthColors.primaryDark, // #A84E28 on #FFE8DC = ~5.2:1 contrast
    fontFamily: 'Nunito_600SemiBold',
  },
  upgradeButton: {
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
  },
  upgradeLabel: {
    fontFamily: 'Nunito_700Bold',
  },
  restoreLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
  },
});
