import type { CurrentOffer } from '@/features/saver/use-offers';

import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, Portal, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useSaverStore } from '@/features/saver/saver-store';
import { formatOfferPrice, useCurrentOffers } from '@/features/saver/use-offers';

type OffersStripProps = {
  /** Called when the user wants meal ideas built around a tapped offer. */
  onCookIdeas: (offer: CurrentOffer) => void;
};

/**
 * Saver Cupboard strip on the Suggest screen.
 *
 * No supermarket chosen -> a single quiet chip inviting the user to pick one.
 * Supermarket chosen -> a horizontal row of this week's offers. Tapping one
 * opens a small dialog: get meal ideas built around it (plus what's already
 * in the cupboard), or view the product on the retailer's site.
 */
export function OffersStrip({ onCookIdeas }: OffersStripProps) {
  const retailerIds = useSaverStore(s => s.retailerIds);
  const { data: offers } = useCurrentOffers();
  const [selected, setSelected] = useState<CurrentOffer | null>(null);

  if (retailerIds.length === 0) {
    return (
      <View style={styles.row}>
        <Text variant="labelLarge" style={styles.label}>Saver Cupboard</Text>
        <View style={styles.chipRow}>
          <Chip
            icon="tag-outline"
            compact
            onPress={() => router.push('/settings/supermarkets' as any)}
            style={styles.chip}
            textStyle={styles.chipText}
          >
            Pick your supermarket to cook around this week's offers
          </Chip>
        </View>
      </View>
    );
  }

  if (!offers || offers.length === 0)
    return null;

  const retailerNames = [...new Set(offers.map(o => o.retailer_name))].join(' & ');

  function handleCookIdeas() {
    if (!selected)
      return;
    const offer = selected;
    setSelected(null);
    onCookIdeas(offer);
  }

  function handleViewProduct() {
    if (selected?.source_url)
      Linking.openURL(selected.source_url);
    setSelected(null);
  }

  return (
    <View style={styles.row}>
      <Text variant="labelLarge" style={styles.label}>
        {`On offer at ${retailerNames} this week`}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {offers.map(o => (
          <Chip
            key={o.id}
            compact
            style={styles.chip}
            textStyle={styles.chipText}
            onPress={() => setSelected(o)}
          >
            {`${o.canonical_ingredient ?? o.product_name} ${formatOfferPrice(o.price_pence)}`}
          </Chip>
        ))}
      </ScrollView>

      <Portal>
        <Dialog visible={selected !== null} onDismiss={() => setSelected(null)}>
          <Dialog.Title style={styles.dialogTitle}>{selected?.product_name}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogBody}>
              {selected
                ? `${formatOfferPrice(selected.price_pence)}${
                  selected.was_price_pence != null ? ` (was ${formatOfferPrice(selected.was_price_pence)})` : ''
                }${selected.pack_size ? ` · ${selected.pack_size}` : ''} at ${selected.retailer_name}`
                : ''}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setSelected(null)}>Close</Button>
            {!!selected?.source_url && (
              <Button icon="open-in-new" onPress={handleViewProduct}>
                {selected ? `View at ${selected.retailer_name}` : 'View'}
              </Button>
            )}
            <Button mode="contained" icon="silverware-fork-knife" onPress={handleCookIdeas}>
              What could I make?
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 6,
  },
  label: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: WarmHearthColors.surface,
    borderColor: WarmHearthColors.outline,
    borderWidth: 1,
  },
  chipText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
  },
  dialogTitle: {
    fontFamily: 'Nunito_700Bold',
  },
  dialogBody: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  dialogActions: {
    flexWrap: 'wrap',
    gap: 4,
  },
});
