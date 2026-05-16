import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';

/**
 * Shown on the home screen the first time an authenticated user lands.
 * Briefly explains the app and offers a CTA to add their first item.
 * Dismissed permanently after the user taps either button.
 */
export function WelcomeCard() {
  const welcomeSeen = useOnboardingStore(s => s.welcomeSeen);
  const dismissWelcome = useOnboardingStore(s => s.dismissWelcome);

  if (welcomeSeen)
    return null;

  function handleAddItem() {
    dismissWelcome();
    router.push('/(tabs)/inventory');
  }

  return (
    <View style={styles.card}>
      <View style={styles.iconRow}>
        <MaterialCommunityIcons name="hand-wave-outline" size={28} color={WarmHearthColors.primary} />
      </View>

      <Text variant="titleMedium" style={styles.title}>
        Welcome to Mother Cupboard!
      </Text>

      <Text variant="bodyMedium" style={styles.body}>
        {'Track what\u2019s in your fridge, freezer, and cupboard. We\u2019ll'}
        {' remind you when dates are coming up and suggest meals based'}
        {' on what you have.'}
      </Text>

      <Text variant="bodyMedium" style={styles.body}>
        Start by adding your first item — scan a barcode, speak
        it aloud, type it in manually, or photograph your shopping
        receipt to add everything in one go. Don’t worry if
        non-food items appear in the receipt list — just remove
        them before confirming.
      </Text>

      <View style={styles.actions}>
        <Button
          mode="contained"
          icon="plus"
          onPress={handleAddItem}
          style={styles.addButton}
          labelStyle={styles.addLabel}
        >
          Add your first item
        </Button>
        <Button
          mode="text"
          onPress={dismissWelcome}
          labelStyle={styles.skipLabel}
          compact
        >
          {'I\u2019ll explore first'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WarmHearthColors.surface,
    borderColor: WarmHearthColors.primary,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 3,
    gap: 10,
    marginHorizontal: 16,
    padding: 20,
    shadowColor: '#D4673A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  iconRow: {
    alignItems: 'center',
  },
  title: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_800ExtraBold',
    textAlign: 'center',
  },
  body: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  addButton: {
    borderRadius: 12,
    width: '100%',
  },
  addLabel: {
    fontFamily: 'Nunito_700Bold',
  },
  skipLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
  },
});
