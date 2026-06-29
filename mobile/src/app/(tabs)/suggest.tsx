import type { AdventurousnessLevel, MealSuggestion, MoodFilter } from '../../../../shared/types/meal-suggestion.types';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, Divider, Portal, RadioButton, SegmentedButtons, Switch, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { PaywallGate } from '@/features/auth/components/paywall-gate';
import { useEntitlements } from '@/features/auth/entitlements';
import { useInventoryItems } from '@/features/inventory/use-inventory-items';
import { FeatureTip } from '@/features/onboarding/components/feature-tip';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { FullRecipeSheet } from '@/features/suggest/components/full-recipe-sheet';
import { MealHistorySheet } from '@/features/suggest/components/meal-history-sheet';
import { MealSuggestionCard } from '@/features/suggest/components/meal-suggestion-card';
import { NoneOfTheseFooter } from '@/features/suggest/components/none-of-these-footer';
import { OfflineBanner } from '@/features/suggest/components/offline-banner';
import { SavedMealsSheet } from '@/features/suggest/components/saved-meals-sheet';
import { isLikelyMeat } from '@/features/suggest/is-meat';
import { useSavedMealsStore } from '@/features/suggest/saved-meals-store';
import { useSuggestPreferences } from '@/features/suggest/suggest-preferences-store';
import { useSuggestActions } from '@/features/suggest/use-suggest-actions';
import { useNetworkStatus } from '@/lib/use-network-status';

const ADVENTUROUSNESS_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
];

const SERVINGS_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
];

type MoodOption = { value: MoodFilter; label: string; icon: string };

const MOOD_OPTIONS: MoodOption[] = [
  { value: 'quick', label: 'Quick', icon: 'lightning-bolt' },
  { value: 'comfort', label: 'Comfort', icon: 'sofa-outline' },
  { value: 'healthy', label: 'Healthy', icon: 'heart-outline' },
  { value: 'leftover-rescue', label: 'Leftover rescue', icon: 'recycle' },
  { value: 'batch-cook', label: 'Batch cook', icon: 'pot-steam-outline' },
  { value: 'one-pot', label: 'One-pot', icon: 'pot-outline' },
  { value: 'kid-friendly', label: 'Kid-friendly', icon: 'baby-face-outline' },
  { value: 'favourite', label: 'Favourite', icon: 'heart' },
];

function MoodChips() {
  const moods = useSuggestPreferences(s => s.moods);
  const toggleMood = useSuggestPreferences(s => s.toggleMood);

  return (
    <View style={styles.moodRow}>
      {MOOD_OPTIONS.map(opt => (
        <Chip
          key={opt.value}
          selected={moods.includes(opt.value)}
          onPress={() => toggleMood(opt.value)}
          icon={opt.icon}
          compact
          style={[
            styles.moodChip,
            moods.includes(opt.value) && styles.moodChipSelected,
          ]}
          textStyle={[
            styles.moodChipText,
            moods.includes(opt.value) && styles.moodChipTextSelected,
          ]}
        >
          {opt.label}
        </Chip>
      ))}
    </View>
  );
}

function FeaturedItemPicker() {
  const items = useInventoryItems();
  const featuredItem = useSuggestPreferences(s => s.featuredItem);
  const setFeaturedItem = useSuggestPreferences(s => s.setFeaturedItem);
  const [pickerVisible, setPickerVisible] = useState(false);

  // If the featured item is no longer in the cupboard (used up / removed), drop it.
  useEffect(() => {
    if (featuredItem && !items.some(i => i.name === featuredItem))
      setFeaturedItem(null);
  }, [featuredItem, items, setFeaturedItem]);

  return (
    <>
      <Chip
        icon="food-variant"
        onPress={() => setPickerVisible(true)}
        compact
        style={[styles.moodChip, !!featuredItem && styles.moodChipSelected]}
        textStyle={[styles.moodChipText, !!featuredItem && styles.moodChipTextSelected]}
      >
        {featuredItem ? `Using: ${featuredItem}` : 'Pick an ingredient'}
      </Chip>
      <Portal>
        <Dialog visible={pickerVisible} onDismiss={() => setPickerVisible(false)}>
          <Dialog.Title style={{ fontFamily: 'Nunito_700Bold' }}>Keen to use?</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 340, paddingHorizontal: 0 }}>
            <ScrollView>
              <RadioButton.Item
                label="No preference"
                value=""
                status={!featuredItem ? 'checked' : 'unchecked'}
                onPress={() => { setFeaturedItem(null); setPickerVisible(false); }}
              />
              {items.map(i => (
                <RadioButton.Item
                  key={i.id}
                  label={i.name}
                  value={i.name}
                  status={featuredItem === i.name ? 'checked' : 'unchecked'}
                  onPress={() => { setFeaturedItem(i.name); setPickerVisible(false); }}
                />
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setPickerVisible(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="lightbulb-outline"
        size={48}
        color={WarmHearthColors.outline}
      />
      <Text variant="bodyLarge" style={styles.emptyTitle}>
        What shall we cook?
      </Text>
      <Text variant="bodyMedium" style={styles.emptyBody}>
        Pick your preferences and tap Generate to get meal ideas
        based on what's in your cupboard.
      </Text>
    </View>
  );
}

type ControlsPanelProps = {
  hasItems: boolean;
  isOffline: boolean;
  isPending: boolean;
  error: Error | null;
  onGenerate: () => void;
};

function ControlsPanel({ hasItems, isOffline, isPending, error, onGenerate }: ControlsPanelProps) {
  const suggestTipSeen = useOnboardingStore(s => s.suggestTipSeen);
  const dismissTip = useOnboardingStore(s => s.dismissTip);
  const adventurousness = useSuggestPreferences(s => s.adventurousness);
  const servings = useSuggestPreferences(s => s.servings);
  const setAdventurousness = useSuggestPreferences(s => s.setAdventurousness);
  const setServings = useSuggestPreferences(s => s.setServings);
  const vegetarian = useSuggestPreferences(s => s.vegetarian);
  const setVegetarian = useSuggestPreferences(s => s.setVegetarian);
  const featuredItem = useSuggestPreferences(s => s.featuredItem);

  return (
    <View style={styles.controls}>
      {!suggestTipSeen && (
        <FeatureTip
          icon="lightbulb-on-outline"
          title="AI-powered meal ideas"
          body="Set your adventurousness, pick a mood, and we'll suggest meals based on what's actually in your cupboard. Save favourites and track what you cook."
          onDismiss={() => dismissTip('suggestTipSeen')}
        />
      )}

      <View style={styles.controlRow}>
        <Text variant="labelLarge" style={styles.label}>Adventurousness</Text>
        <SegmentedButtons
          value={String(adventurousness)}
          onValueChange={v => setAdventurousness(Number(v) as AdventurousnessLevel)}
          buttons={ADVENTUROUSNESS_OPTIONS}
          density="small"
        />
      </View>

      <View style={styles.controlRow}>
        <Text variant="labelLarge" style={styles.label}>Servings</Text>
        <SegmentedButtons
          value={String(servings)}
          onValueChange={v => setServings(Number(v))}
          buttons={SERVINGS_OPTIONS}
          density="small"
        />
      </View>

      <Divider style={styles.divider} />

      <View style={styles.controlRow}>
        <Text variant="labelLarge" style={styles.label}>
          {'What\u2019s the mood?'}
        </Text>
        <MoodChips />
      </View>

      <View style={styles.controlRow}>
        <Text variant="labelLarge" style={styles.label}>Keen to use something?</Text>
        <FeaturedItemPicker />
      </View>

      <View style={styles.veggieRow}>
        <Text variant="labelLarge" style={styles.label}>Vegetarian</Text>
        <Switch value={vegetarian} onValueChange={setVegetarian} color={WarmHearthColors.primary} />
      </View>

      {vegetarian && isLikelyMeat(featuredItem) && (
        <Text variant="bodySmall" style={styles.conflictNote}>
          {`Vegetarian's on, so we'll save the ${featuredItem} for another day and find you something meat-free. 🥕`}
        </Text>
      )}

      <Button
        mode="contained"
        onPress={onGenerate}
        loading={isPending}
        disabled={isPending || !hasItems || isOffline}
        icon="auto-fix"
        style={styles.generateButton}
        labelStyle={styles.generateLabel}
      >
        {isPending ? 'Generating…' : 'Generate suggestions'}
      </Button>

      {!hasItems && (
        <Text variant="bodySmall" style={styles.hint}>
          Add items to your cupboard first so we know what you have.
        </Text>
      )}

      {error && (
        <Text variant="bodySmall" style={styles.errorText}>
          {error.message || 'Something went wrong — try again.'}
        </Text>
      )}
    </View>
  );
}

type ResultsListProps = {
  suggestions: MealSuggestion[];
  isPending: boolean;
  isOffline: boolean;
  onRegenerate: () => void;
  onStartAgain: () => void;
  onSurpriseMe: () => void;
  onTweakAndRetry: () => void;
  onViewRecipe: (suggestion: MealSuggestion) => void;
};

function ResultsList(props: ResultsListProps) {
  const { suggestions, isPending, isOffline, onRegenerate, onStartAgain, onSurpriseMe, onTweakAndRetry, onViewRecipe } = props;
  return (
    <FlatList
      data={suggestions}
      keyExtractor={s => s.id}
      renderItem={({ item }) => <MealSuggestionCard suggestion={item} onViewRecipe={onViewRecipe} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={(
        <View style={styles.resultsHeader}>
          {isOffline && <OfflineBanner />}
          <View style={styles.resultsHeaderButtons}>
            <Button
              mode="text"
              onPress={onStartAgain}
              disabled={isPending}
              icon="tune-variant"
              compact
              style={styles.regenerateButton}
              labelStyle={styles.regenerateLabel}
            >
              Start again
            </Button>
            <Button
              mode="outlined"
              onPress={onRegenerate}
              loading={isPending}
              disabled={isPending || isOffline}
              icon="refresh"
              compact
              style={styles.regenerateButton}
              labelStyle={styles.regenerateLabel}
            >
              {isPending ? 'Generating…' : 'Regenerate'}
            </Button>
          </View>
        </View>
      )}
      ListFooterComponent={(
        <NoneOfTheseFooter
          isPending={isPending || isOffline}
          onSurpriseMe={onSurpriseMe}
          onTweakAndRetry={onTweakAndRetry}
        />
      )}
    />
  );
}

export default function SuggestScreen() {
  const { canUseSuggestions } = useEntitlements();

  if (!canUseSuggestions) {
    return (
      <View style={styles.container}>
        <PaywallGate
          feature="AI Meal Suggestions"
          description="Get personalised meal ideas based on what's in your cupboard, with mood filters, favourites, and cooking history."
          icon="lightbulb-on-outline"
        />
      </View>
    );
  }

  return <SuggestScreenContent />;
}

function SuggestScreenContent() {
  const { data: suggestions, isPending, error, hasItems, generate, surpriseMe, rejectCurrent } = useSuggestActions();
  const savedCount = useSavedMealsStore(s => s.savedMeals.length);
  const [view, setView] = useState<'controls' | 'history' | 'recipe' | 'results' | 'saved'>('controls');
  const [activeRecipe, setActiveRecipe] = useState<MealSuggestion | null>(null);
  const isConnected = useNetworkStatus();
  const isOffline = isConnected === false;

  function handleGenerate() {
    generate();
    setView('results');
  }

  function handleSurpriseMe() {
    surpriseMe(suggestions ?? []);
  }

  function handleTweakAndRetry() {
    rejectCurrent(suggestions ?? []);
    setView('controls');
  }

  function handleViewRecipe(s: MealSuggestion) {
    setActiveRecipe(s);
    setView('recipe');
  }

  function handleStartAgain() {
    setView('controls');
  }

  const hasResults = view === 'results' && suggestions && suggestions.length > 0;

  if (view === 'saved')
    return <SavedMealsSheet onClose={() => setView('controls')} />;
  if (view === 'history')
    return <MealHistorySheet onClose={() => setView('controls')} />;
  if (view === 'recipe' && activeRecipe)
    return <FullRecipeSheet suggestion={activeRecipe} onClose={() => setView('results')} />;
  if (hasResults)
    return renderResults();
  return renderControls();

  function renderResults() {
    return (
      <View style={styles.container}>
        <ResultsList
          suggestions={suggestions!}
          isPending={isPending}
          isOffline={isOffline}
          onRegenerate={handleGenerate}
          onStartAgain={handleStartAgain}
          onSurpriseMe={handleSurpriseMe}
          onTweakAndRetry={handleTweakAndRetry}
          onViewRecipe={handleViewRecipe}
        />
      </View>
    );
  }

  function renderControls() {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isOffline && <OfflineBanner />}
          <ControlsPanel hasItems={hasItems} isPending={isPending} error={error} onGenerate={handleGenerate} isOffline={isOffline} />
          <View style={styles.shortcutRow}>
            {savedCount > 0 && (
              <Button mode="text" icon="bookmark-outline" onPress={() => setView('saved')} labelStyle={styles.shortcutLabel} compact>
                {`Saved (${savedCount})`}
              </Button>
            )}
            <Button mode="text" icon="history" onPress={() => setView('history')} labelStyle={styles.shortcutLabel} compact>
              History & favourites
            </Button>
          </View>
          {!isPending && <EmptyState />}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WarmHearthColors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  controls: {
    gap: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  controlRow: {
    gap: 6,
  },
  veggieRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  conflictNote: {
    color: WarmHearthColors.primary,
    fontFamily: 'Nunito_400Regular',
    marginTop: -2,
  },
  label: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  divider: {
    marginVertical: 4,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    backgroundColor: WarmHearthColors.surface,
    borderColor: WarmHearthColors.outline,
    borderWidth: 1,
  },
  moodChipSelected: {
    backgroundColor: '#FFE8DC',
    borderColor: WarmHearthColors.primary,
  },
  moodChipText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
  },
  moodChipTextSelected: {
    color: WarmHearthColors.primary,
    fontFamily: 'Nunito_600SemiBold',
  },
  generateButton: {
    borderRadius: 12,
    marginTop: 4,
  },
  generateLabel: {
    fontFamily: 'Nunito_700Bold',
  },
  hint: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
  },
  errorText: {
    color: WarmHearthColors.expiryUrgent,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  resultsHeader: {
    gap: 0,
    paddingBottom: 4,
  },
  resultsHeaderButtons: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  regenerateButton: {
    borderRadius: 12,
  },
  regenerateLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
  shortcutRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  shortcutLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  emptyBody: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
});
