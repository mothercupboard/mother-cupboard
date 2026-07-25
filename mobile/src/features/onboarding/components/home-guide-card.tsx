import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';

const TABS = [
  {
    icon: 'archive-outline',
    name: 'Inventory',
    description:
      'Your fridge, freezer and cupboard. Add items by barcode, voice, typing, or a photo of your receipt.',
  },
  {
    icon: 'lightbulb-on-outline',
    name: 'Suggest',
    description:
      'Meal ideas from what you already have, leaning on whatever needs using up.',
  },
  {
    icon: 'cog-outline',
    name: 'Settings',
    description:
      'Reminders, household sharing, your supermarkets and more.',
  },
];

/**
 * Shown on the home screen after the WelcomeCard is dismissed, until the user
 * closes it — once they know their way around it just takes up space.
 */
export function HomeGuideCard() {
  const welcomeSeen = useOnboardingStore(s => s.welcomeSeen);
  const homeGuideDismissed = useOnboardingStore(s => s.homeGuideDismissed);
  const dismissTip = useOnboardingStore(s => s.dismissTip);

  if (!welcomeSeen || homeGuideDismissed)
    return null;

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <Text variant="titleSmall" style={styles.heading}>
          What you can do
        </Text>
        <IconButton
          icon="close"
          size={16}
          onPress={() => dismissTip('homeGuideDismissed')}
          accessibilityLabel="Dismiss guide"
          style={styles.closeButton}
        />
      </View>
      {TABS.map(tab => (
        <View key={tab.name} style={styles.row}>
          <MaterialCommunityIcons
            name={tab.icon as any}
            size={24}
            color={WarmHearthColors.primary}
            style={styles.icon}
          />
          <View style={styles.textBlock}>
            <Text variant="labelLarge" style={styles.tabName}>
              {tab.name}
            </Text>
            <Text variant="bodySmall" style={styles.desc}>
              {tab.description}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 12,
    elevation: 1,
    gap: 16,
    marginHorizontal: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  heading: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  closeButton: {
    margin: -8,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  icon: {
    marginTop: 1,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  tabName: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  desc: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
});
