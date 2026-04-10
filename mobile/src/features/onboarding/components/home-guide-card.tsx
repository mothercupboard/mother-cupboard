import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';

const TABS = [
  {
    icon: 'archive-outline',
    name: 'Inventory',
    description:
      'Add and track items in your fridge, freezer and cupboard. Tap the + button to get started.',
  },
  {
    icon: 'lightbulb-on-outline',
    name: 'Suggest',
    description:
      'Get meal ideas based on what you already have — great for using things up before they expire.',
  },
  {
    icon: 'cog-outline',
    name: 'Settings',
    description:
      'Manage your account, control expiry reminders, and set up notifications.',
  },
];

/**
 * Shown on the home screen after the WelcomeCard is dismissed,
 * so there is always something useful on the home screen for new users.
 */
export function HomeGuideCard() {
  const welcomeSeen = useOnboardingStore(s => s.welcomeSeen);
  if (!welcomeSeen) return null;

  return (
    <View style={styles.card}>
      <Text variant="titleSmall" style={styles.heading}>
        What you can do
      </Text>
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
  heading: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 2,
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
