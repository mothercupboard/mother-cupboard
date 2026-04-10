import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useTrialStatus } from '@/features/auth/trial-store';

function ActiveBanner({ daysRemaining }: { daysRemaining: number }) {
  return (
    <View style={styles.banner} accessibilityRole="summary" accessibilityLabel={`Free trial, ${daysRemaining} days remaining`}>
      <MaterialCommunityIcons name="shield-star-outline" size={20} color={WarmHearthColors.secondary} importantForAccessibility="no" />
      <Text variant="bodySmall" style={styles.activeText}>
        {'Free trial \u2014 '}
        {daysRemaining}
        {' day'}
        {daysRemaining !== 1 ? 's' : ''}
        {' remaining'}
      </Text>
    </View>
  );
}

function ExpiringBanner({ daysRemaining }: { daysRemaining: number }) {
  return (
    <View style={[styles.banner, styles.expiringBanner]} accessibilityRole="alert" accessibilityLabel={`Trial ending in ${daysRemaining} days`}>
      <MaterialCommunityIcons name="clock-alert-outline" size={20} color={WarmHearthColors.expiryWarning} importantForAccessibility="no" />
      <View style={styles.textCol}>
        <Text variant="bodySmall" style={styles.expiringText}>
          {'Trial active for '}
          {daysRemaining}
          {' more day'}
          {daysRemaining !== 1 ? 's' : ''}
        </Text>
        <Text variant="bodySmall" style={styles.subText}>
          Upgrade to keep meal suggestions, expiry alerts, and more.
        </Text>
      </View>
    </View>
  );
}

function ExpiredBanner() {
  return (
    <View style={[styles.banner, styles.expiredBanner]} accessibilityRole="alert" accessibilityLabel="Your free trial has ended">
      <MaterialCommunityIcons name="alert-circle-outline" size={20} color={WarmHearthColors.expiryUrgent} importantForAccessibility="no" />
      <View style={styles.textCol}>
        <Text variant="bodySmall" style={styles.expiredText}>
          Your free trial has ended
        </Text>
        <Text variant="bodySmall" style={styles.subText}>
          Upgrade to unlock all features. Your data is safe and waiting.
        </Text>
        <Button
          mode="contained"
          compact
          style={styles.upgradeButton}
          labelStyle={styles.upgradeLabel}
        >
          View plans
        </Button>
      </View>
    </View>
  );
}

/**
 * Displays trial status on the home screen. Renders nothing when there
 * is no active trial (user has upgraded or has no trial metadata).
 */
export function TrialBanner() {
  const trial = useTrialStatus();

  switch (trial.state) {
    case 'active':
      return <ActiveBanner daysRemaining={trial.daysRemaining} />;
    case 'expiring':
      return <ExpiringBanner daysRemaining={trial.daysRemaining} />;
    case 'expired':
      return <ExpiredBanner />;
    case 'none':
      return null;
  }
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    padding: 12,
  },
  expiringBanner: {
    backgroundColor: '#FFF8E1',
  },
  expiredBanner: {
    backgroundColor: '#FFEBEE',
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  activeText: {
    color: WarmHearthColors.secondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  expiringText: {
    color: WarmHearthColors.expiryWarning,
    fontFamily: 'Nunito_600SemiBold',
  },
  expiredText: {
    color: WarmHearthColors.expiryUrgent,
    fontFamily: 'Nunito_600SemiBold',
  },
  subText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
  upgradeButton: {
    borderRadius: 10,
    marginTop: 6,
  },
  upgradeLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
  },
});
