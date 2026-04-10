import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { TrialBanner } from '@/features/auth/components/trial-banner';
import { StaleInventoryNudge } from '@/features/inventory/components/stale-inventory-nudge';
import { ExpiryNudgeCard } from '@/features/notifications/expiry-nudge-card';
import { WelcomeCard } from '@/features/onboarding/components/welcome-card';
import { HomeGuideCard } from '@/features/onboarding/components/home-guide-card';

export default function HomeScreen() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text variant="headlineMedium" style={styles.heading}>Home</Text>

      <View style={styles.section}>
        <WelcomeCard />
        <TrialBanner />
        <ExpiryNudgeCard />
        <StaleInventoryNudge />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: WarmHearthColors.background,
  },
  container: {
    paddingBottom: 32,
    paddingTop: 24,
  },
  heading: {
    fontFamily: 'Nunito_700Bold',
    color: WarmHearthColors.textPrimary,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  section: {
    gap: 12,
  },
});
