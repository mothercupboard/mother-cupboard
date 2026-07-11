import type { PurchasesPackage } from 'react-native-purchases';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useGuestStore } from '@/features/guest/guest-store';
import { useRevenueCatStore } from '@/lib/revenuecat/store';

const PRIVACY_POLICY_URL = 'https://mothercupboard.github.io/mother-cupboard/legal/privacy-policy.html';
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

type FeatureRowProps = { icon: string; label: string };

function FeatureRow({ icon, label }: FeatureRowProps) {
  return (
    <View style={styles.featureRow}>
      <MaterialCommunityIcons name={icon as 'check'} size={20} color={WarmHearthColors.primary} />
      <Text variant="bodyMedium" style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const FEATURES: FeatureRowProps[] = [
  { icon: 'lightbulb-on-outline', label: 'Mother Cupboard meal ideas' },
  { icon: 'chef-hat', label: 'Full step-by-step cooking methods' },
  { icon: 'heart-outline', label: 'Saved meals and cooking history' },
  { icon: 'bell-ring-outline', label: 'Expiry reminder alerts' },
  { icon: 'cloud-sync-outline', label: 'Cloud sync and backup' },
];

function PackageCard({
  pkg,
  isSelected,
  onSelect,
  badge,
}: {
  pkg: PurchasesPackage;
  isSelected: boolean;
  onSelect: () => void;
  badge?: string;
}) {
  const price = pkg.product.priceString;
  const isAnnual = pkg.packageType === 'ANNUAL';
  const period = isAnnual ? '/year' : '/month';

  return (
    <Button
      mode={isSelected ? 'contained' : 'outlined'}
      onPress={onSelect}
      style={[styles.packageCard, isSelected && styles.packageCardSelected]}
      contentStyle={styles.packageContent}
      labelStyle={[styles.packageLabel, isSelected && styles.packageLabelSelected]}
    >
      {badge ? `${price}${period}  \u2014  ${badge}` : `${price}${period}`}
    </Button>
  );
}

export default function PaywallScreen() {
  const offering = useRevenueCatStore(s => s.offering);
  const isProcessing = useRevenueCatStore(s => s.isProcessing);
  const error = useRevenueCatStore(s => s.error);
  const purchase = useRevenueCatStore(s => s.purchase);
  const restore = useRevenueCatStore(s => s.restore);
  const refresh = useRevenueCatStore(s => s.refresh);
  const clearError = useRevenueCatStore(s => s.clearError);
  const isGuest = useGuestStore(s => s.isGuest);

  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
    refresh().then(() => {
      // Check if offerings loaded after refresh
      const currentOffering = useRevenueCatStore.getState().offering;
      if (!currentOffering) {
        setLoadError('No subscription plans available. This can happen if App Store Connect products are still being reviewed, or the Paid Apps agreement needs signing. Please try again later.');
      }
    }).catch((err: any) => {
      setLoadError(err?.message ?? 'Failed to load plans. Please try again.');
    });
  }, [refresh]);

  // Default-select annual package
  useEffect(() => {
    if (offering && !selectedPkg) {
      const annual = offering.annual ?? offering.availablePackages.find(p => p.packageType === 'ANNUAL');
      const monthly = offering.monthly ?? offering.availablePackages[0];
      setSelectedPkg(annual ?? monthly ?? null);
    }
  }, [offering, selectedPkg]);

  async function handlePurchase() {
    if (!selectedPkg)
      return;
    // Guests must create an account before subscribing
    if (isGuest) {
      router.replace('/(auth)/register');
      return;
    }
    clearError();
    const success = await purchase(selectedPkg);
    if (success) {
      router.back();
    }
  }

  async function handleRestore() {
    clearError();
    const success = await restore();
    if (success) {
      router.back();
    }
  }

  if (!offering) {
    if (loadError) {
      return (
        <View style={styles.loading}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={WarmHearthColors.expiryWarning} />
          <Text variant="bodyMedium" style={styles.errorMessage}>{loadError}</Text>
          <Button mode="outlined" onPress={() => router.back()} style={{ borderRadius: 12, marginTop: 12 }}>
            Go back
          </Button>
        </View>
      );
    }
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={WarmHearthColors.primary} size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>Loading plans...</Text>
      </View>
    );
  }

  const packages = offering.availablePackages;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="crown-outline" size={48} color={WarmHearthColors.primary} />
        <Text variant="headlineSmall" style={styles.headline}>
          Upgrade to Premium
        </Text>
        <Text variant="bodyMedium" style={styles.subline}>
          Get the most out of Mother Cupboard. Less than a cup of coffee a month.
        </Text>
      </View>

      <View style={styles.featureList}>
        {FEATURES.map(f => <FeatureRow key={f.label} {...f} />)}
      </View>

      <View style={styles.packages}>
        {packages.map((pkg) => {
          const isAnnual = pkg.packageType === 'ANNUAL';
          return (
            <PackageCard
              key={pkg.identifier}
              pkg={pkg}
              isSelected={selectedPkg?.identifier === pkg.identifier}
              onSelect={() => setSelectedPkg(pkg)}
              badge={isAnnual ? 'Save over 35%' : undefined}
            />
          );
        })}
      </View>

      {error
        ? (
            <View style={styles.errorBanner}>
              <Text variant="bodySmall" style={styles.errorText}>{error}</Text>
            </View>
          )
        : null}

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handlePurchase}
          loading={isProcessing}
          disabled={isProcessing || !selectedPkg}
          style={styles.purchaseButton}
          contentStyle={styles.purchaseContent}
          labelStyle={styles.purchaseLabel}
          icon="rocket-launch-outline"
        >
          {isProcessing ? 'Processing...' : 'Subscribe now'}
        </Button>

        <Button
          mode="text"
          onPress={handleRestore}
          disabled={isProcessing}
          labelStyle={styles.restoreLabel}
          compact
          icon="restore"
        >
          Restore purchases
        </Button>

        <Button
          mode="text"
          onPress={() => router.back()}
          disabled={isProcessing}
          labelStyle={styles.dismissLabel}
          compact
        >
          Not now
        </Button>
      </View>

      <Text variant="bodySmall" style={styles.legal}>
        {Platform.OS === 'ios'
          ? 'Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Manage subscriptions in your device Settings.'
          : 'Payment will be charged to your Google Play account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Manage subscriptions in the Google Play app.'}
      </Text>

      <View style={styles.legalLinks}>
        <Text
          variant="bodySmall"
          style={styles.legalLink}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          accessibilityRole="link"
        >
          Privacy Policy
        </Text>
        <Text variant="bodySmall" style={styles.legalDot}>·</Text>
        <Text
          variant="bodySmall"
          style={styles.legalLink}
          onPress={() => Linking.openURL(TERMS_URL)}
          accessibilityRole="link"
        >
          Terms of Use
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: WarmHearthColors.background,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  errorMessage: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  container: {
    backgroundColor: WarmHearthColors.background,
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  header: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  headline: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_800ExtraBold',
    textAlign: 'center',
  },
  subline: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
    textAlign: 'center',
  },
  featureList: {
    gap: 12,
    marginBottom: 28,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  featureLabel: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  packages: {
    gap: 12,
    marginBottom: 20,
  },
  packageCard: {
    borderRadius: 12,
  },
  packageCardSelected: {
    elevation: 2,
  },
  packageContent: {
    paddingVertical: 8,
  },
  packageLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
  },
  packageLabelSelected: {
    fontFamily: 'Nunito_700Bold',
  },
  errorBanner: {
    backgroundColor: '#FDE8E8',
    borderLeftColor: WarmHearthColors.expiryUrgent,
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
  },
  errorText: {
    color: WarmHearthColors.expiryUrgent,
    fontFamily: 'Nunito_400Regular',
  },
  actions: {
    alignItems: 'center',
    gap: 8,
  },
  purchaseButton: {
    borderRadius: 12,
    width: '100%',
  },
  purchaseContent: {
    paddingVertical: 6,
  },
  purchaseLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  restoreLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
  },
  dismissLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
  },
  legal: {
    color: WarmHearthColors.outline,
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  legalLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
  legalLink: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalDot: {
    color: WarmHearthColors.outline,
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
  },
});
