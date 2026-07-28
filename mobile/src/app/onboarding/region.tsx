import type { RegionCode } from '@/lib/region';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useAuthStore } from '@/features/auth/auth-store';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { SUPPORTED_REGIONS, useRegionStore } from '@/lib/region';

/**
 * Onboarding → Where do you shop?
 *
 * First-run region pick. Region drives which supermarkets, currency and
 * weekly offers the user sees, so we confirm it up front rather than relying
 * on the auto-detected seed — the list is pre-selected to the detected region
 * (usually a single "Continue" tap). Region rarely changes, and it's still
 * editable later in Settings → Region.
 *
 * Sits last in the onboarding chain (after AI consent), so an existing user
 * updating the app sees only this one new screen before the tabs.
 */
export default function OnboardingRegionScreen() {
  const currentRegion = useRegionStore(s => s.region);
  const setRegion = useRegionStore(s => s.setRegion);
  const confirmRegion = useOnboardingStore(s => s.confirmRegion);
  const session = useAuthStore(s => s.session);
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<RegionCode>(currentRegion);

  function handleContinue() {
    setRegion(selected);
    confirmRegion();
    // Mirror the routing the AI-consent step used to do — region is the final
    // onboarding gate before the app / login.
    if (session)
      router.replace('/(tabs)/inventory');
    else
      router.replace('/(auth)/login');
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={40} color={WarmHearthColors.primary} />
        </View>

        <Text variant="headlineMedium" style={styles.heading}>
          Where do you shop?
        </Text>
        <Text variant="bodyMedium" style={styles.subheading}>
          We'll show the right supermarkets, prices and weekly offers for your
          country. You can change this any time in Settings.
        </Text>

        <View style={styles.options}>
          {SUPPORTED_REGIONS.map((r) => {
            const isSelected = r.code === selected;
            return (
              <Pressable
                key={r.code}
                onPress={() => setSelected(r.code)}
                style={[styles.option, isSelected && styles.optionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={r.label}
              >
                <View style={styles.optionText}>
                  <Text variant="titleMedium" style={styles.optionLabel}>{r.label}</Text>
                  <Text variant="bodySmall" style={styles.optionMeta}>{r.currency}</Text>
                </View>
                <MaterialCommunityIcons
                  name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={24}
                  color={isSelected ? WarmHearthColors.primary : WarmHearthColors.outline}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleContinue}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          accessibilityLabel="Continue with the selected region"
          accessibilityRole="button"
        >
          Continue
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WarmHearthColors.background,
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  heroRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  heading: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  subheading: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
    textAlign: 'center',
  },
  options: {
    gap: 12,
    marginTop: 8,
  },
  option: {
    alignItems: 'center',
    backgroundColor: WarmHearthColors.surface,
    borderColor: WarmHearthColors.outline,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  optionSelected: {
    borderColor: WarmHearthColors.primary,
    backgroundColor: `${WarmHearthColors.primary}0D`,
  },
  optionText: {
    gap: 2,
  },
  optionLabel: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  optionMeta: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  footer: {
    borderTopColor: WarmHearthColors.outline,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingTop: 16,
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
});
