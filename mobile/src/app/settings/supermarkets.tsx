import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Checkbox, List, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useSaverStore } from '@/features/saver/saver-store';
import { useRetailers } from '@/features/saver/use-offers';

/**
 * Settings → My supermarkets (Saver Cupboard)
 *
 * Choose which supermarket(s) you shop at. Their weekly offers feed into
 * Suggest so meal ideas lean towards what's cheap this week. The retailer
 * list comes from the backend, so new supermarkets appear here without an
 * app update.
 */
export default function SupermarketsScreen() {
  const retailerIds = useSaverStore(s => s.retailerIds);
  const toggleRetailer = useSaverStore(s => s.toggleRetailer);
  const { data: retailers, isPending, error } = useRetailers();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.intro}>
        <Text variant="bodyMedium" style={styles.introText}>
          Tick where you shop and meal ideas will lean towards each week's offers.
        </Text>
        <Text variant="bodySmall" style={styles.helpText}>
          Offers refresh every Monday. More supermarkets on the way.
        </Text>
      </View>

      {isPending && <ActivityIndicator style={styles.spinner} color={WarmHearthColors.primary} />}

      {error && (
        <Text variant="bodySmall" style={styles.errorText}>
          Couldn't load the supermarket list — check your connection and try again.
        </Text>
      )}

      <List.Section>
        {(retailers ?? []).map(r => (
          <Checkbox.Item
            key={r.id}
            label={r.display_name}
            status={retailerIds.includes(r.id) ? 'checked' : 'unchecked'}
            onPress={() => toggleRetailer(r.id)}
            color={WarmHearthColors.primary}
            labelStyle={styles.itemLabel}
          />
        ))}
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WarmHearthColors.background,
    flexGrow: 1,
  },
  intro: {
    gap: 8,
    padding: 16,
  },
  introText: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_400Regular',
  },
  helpText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  spinner: {
    marginTop: 16,
  },
  errorText: {
    color: WarmHearthColors.expiryUrgent,
    fontFamily: 'Nunito_400Regular',
    paddingHorizontal: 16,
  },
  itemLabel: {
    fontFamily: 'Nunito_400Regular',
  },
});
