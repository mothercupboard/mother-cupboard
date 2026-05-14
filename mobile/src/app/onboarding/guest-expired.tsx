import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';

export default function GuestExpiredScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="fridge-outline"
          size={64}
          color={WarmHearthColors.primary}
          style={styles.icon}
        />

        <Text variant="headlineMedium" style={styles.heading}>
          Your free trial has ended
        </Text>

        <Text variant="bodyLarge" style={styles.body}>
          We hope you've seen how much easier Mother Cupboard makes managing your kitchen.
        </Text>

        <View style={styles.nudgeCard}>
          <Text variant="titleSmall" style={styles.nudgeHeading}>
            Create a free account to keep going
          </Text>
          <Text variant="bodyMedium" style={styles.nudgeItem}>
            ✓ Keep all the items you've already added
          </Text>
          <Text variant="bodyMedium" style={styles.nudgeItem}>
            ✓ 30-day full trial — no payment needed
          </Text>
          <Text variant="bodyMedium" style={styles.nudgeItem}>
            ✓ Sync across all your devices
          </Text>
          <Text variant="bodyMedium" style={styles.nudgeItem}>
            ✓ Expiry alerts, meal suggestions, shopping list
          </Text>
        </View>

        <Text variant="bodySmall" style={styles.coffeeNote}>
          After your trial, less than a cup of coffee a month.
        </Text>

        <View style={styles.buttons}>
          <Button
            mode="contained"
            onPress={() => router.replace('/(auth)/register')}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="account-plus-outline"
            accessibilityLabel="Create a free account"
            accessibilityRole="button"
          >
            Create a free account
          </Button>

          <Button
            mode="text"
            onPress={() => router.replace('/(auth)/login')}
            labelStyle={styles.loginLabel}
            accessibilityLabel="Sign in to existing account"
            accessibilityRole="button"
          >
            Already have an account? Sign in
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WarmHearthColors.background,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    gap: 16,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 4,
  },
  heading: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  body: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 26,
    textAlign: 'center',
  },
  nudgeCard: {
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 16,
    gap: 8,
    padding: 20,
    shadowColor: WarmHearthColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  nudgeHeading: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 4,
  },
  nudgeItem: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
  },
  coffeeNote: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
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
  loginLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
});
