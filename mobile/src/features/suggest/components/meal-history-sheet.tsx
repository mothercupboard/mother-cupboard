import type { MealSuggestion } from '../../../../../shared/types/meal-suggestion.types';
import type { CookedMealEntry } from '@/features/suggest/saved-meals-store';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useSavedMealsStore } from '@/features/suggest/saved-meals-store';

type Tab = 'history' | 'favourites';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function HistoryRow({ entry }: { entry: CookedMealEntry }) {
  const isFav = useSavedMealsStore(s => s.isFavourite(entry.id));
  const favouriteMeal = useSavedMealsStore(s => s.favouriteMeal);
  const unfavouriteMeal = useSavedMealsStore(s => s.unfavouriteMeal);

  return (
    <View style={styles.row}>
      <View style={styles.rowContent}>
        <Text variant="bodyLarge" style={styles.mealTitle} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text variant="bodySmall" style={styles.mealMeta}>
          {formatDate(entry.cookedAt)}
          {' • '}
          {entry.estimatedCookTime}
          {' min'}
        </Text>
      </View>
      <Pressable
        onPress={() => isFav ? unfavouriteMeal(entry.id) : favouriteMeal(entry)}
        hitSlop={16}
        accessibilityLabel={isFav ? 'Remove from favourites' : 'Add to favourites'}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons
          name={isFav ? 'heart' : 'heart-outline'}
          size={22}
          color={isFav ? WarmHearthColors.expiryUrgent : WarmHearthColors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

function FavouriteRow({ meal }: { meal: MealSuggestion }) {
  const unfavouriteMeal = useSavedMealsStore(s => s.unfavouriteMeal);

  return (
    <View style={styles.row}>
      <View style={styles.rowContent}>
        <Text variant="bodyLarge" style={styles.mealTitle} numberOfLines={1}>
          {meal.title}
        </Text>
        <Text variant="bodySmall" style={styles.mealMeta}>
          {meal.estimatedCookTime}
          {' min • '}
          {meal.ingredients.length}
          {' ingredients'}
        </Text>
      </View>
      <Pressable
        onPress={() => unfavouriteMeal(meal.id)}
        hitSlop={16}
        accessibilityLabel={`Remove ${meal.title} from favourites`}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="heart-off-outline" size={22} color={WarmHearthColors.textSecondary} />
      </Pressable>
    </View>
  );
}

function EmptyTab({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name={icon as 'history'} size={40} color={WarmHearthColors.outline} />
      <Text variant="bodyMedium" style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function HistoryList() {
  const cookedMeals = useSavedMealsStore(s => s.cookedMeals);
  const reversed = [...cookedMeals].reverse();

  if (reversed.length === 0) {
    return (
      <EmptyTab
        icon="history"
        text={'No cooking history yet. Tap "Cooked it!" on a suggestion to start tracking.'}
      />
    );
  }

  return (
    <FlatList
      data={reversed}
      keyExtractor={(entry, i) => `${entry.id}-${i}`}
      renderItem={({ item }) => <HistoryRow entry={item} />}
      contentContainerStyle={styles.list}
    />
  );
}

function FavouritesList() {
  const favouriteMeals = useSavedMealsStore(s => s.favouriteMeals);

  if (favouriteMeals.length === 0) {
    return (
      <EmptyTab
        icon="heart-outline"
        text="No favourites yet. Tap the heart on any meal to add it here."
      />
    );
  }

  return (
    <FlatList
      data={favouriteMeals}
      keyExtractor={m => m.id}
      renderItem={({ item }) => <FavouriteRow meal={item} />}
      contentContainerStyle={styles.list}
    />
  );
}

const TAB_BUTTONS = [
  { value: 'history', label: 'History' },
  { value: 'favourites', label: 'Favourites' },
];

export function MealHistorySheet({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('history');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.heading}>Meals</Text>
        <Pressable onPress={onClose} hitSlop={16} accessibilityLabel="Close" accessibilityRole="button">
          <MaterialCommunityIcons name="close" size={24} color={WarmHearthColors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        <SegmentedButtons
          value={tab}
          onValueChange={v => setTab(v as Tab)}
          buttons={TAB_BUTTONS}
          density="small"
        />
      </View>

      {tab === 'history' ? <HistoryList /> : <FavouritesList />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WarmHearthColors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: WarmHearthColors.outline,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  tabRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  list: {
    paddingBottom: 32,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: WarmHearthColors.outline,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  mealTitle: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  mealMeta: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
});
