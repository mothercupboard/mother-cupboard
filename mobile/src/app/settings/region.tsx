import type { RegionCode } from '@/lib/region';

import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, RadioButton, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { SUPPORTED_REGIONS, useRegionStore } from '@/lib/region';

/**
 * Settings → Region
 *
 * Region drives currency, date formatting and (Workstream B) which Open Food
 * Facts country set is preferred when scanning. All supported regions use
 * English, so changing region does not change the app language.
 */
export default function RegionScreen() {
  const region = useRegionStore(s => s.region);
  const setRegion = useRegionStore(s => s.setRegion);

  function handleSelect(code: RegionCode) {
    setRegion(code);
    if (router.canGoBack())
      router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.intro}>
        <Text variant="bodyMedium" style={styles.introText}>
          Choose your region. This sets your currency and date format, and which
          country's products are matched first when you scan a barcode.
        </Text>
        <Text variant="bodySmall" style={styles.helpText}>
          The app stays in English for every region.
        </Text>
      </View>

      <RadioButton.Group value={region} onValueChange={v => handleSelect(v as RegionCode)}>
        <List.Section>
          {SUPPORTED_REGIONS.map(r => (
            <List.Item
              key={r.code}
              title={r.label}
              description={`${r.currency} · ${r.locale}`}
              onPress={() => handleSelect(r.code)}
              right={() => <RadioButton value={r.code} color={WarmHearthColors.primary} />}
            />
          ))}
        </List.Section>
      </RadioButton.Group>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: WarmHearthColors.background,
  },
  intro: {
    padding: 16,
    gap: 8,
  },
  introText: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textPrimary,
  },
  helpText: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
  },
});
