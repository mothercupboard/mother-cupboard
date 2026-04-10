import type { MealSuggestion } from '../../../../../shared/types/meal-suggestion.types';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useSavedMealsStore } from '@/features/suggest/saved-meals-store';

function SavedMealRow({ meal }: { meal: MealSuggestion }) {
  const unsaveMeal = useSavedMealsStore(s => s.unsaveMeal);

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
        onPress={() => unsaveMeal(meal.id)}
        hitSlop={16}
        accessibilityLabel={`Remove ${meal.title} from saved`}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="bookmark-remove-outline" size={22} color={WarmHearthColors.textSecondary} />
      </Pressable>
    </View>
  );
}

function EmptySavedState() {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="bookmark-outline" size={40} color={WarmHearthColors.outline} />
      <Text variant="bodyMedium" style={styles.emptyText}>
        No saved meals yet. Tap Save on any suggestion to bookmark it for later.
      </Text>
    </View>
  );
}

/**
 * Displays the user's saved/bookmarked meal suggestions.
 * Shown inline within the suggest screen when the user taps the saved meals button.
 */
export function SavedMealsSheet({ onClose }: { onClose: () => void }) {
  const savedMeals = useSavedMealsStore(s => s.savedMeals);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.heading}>Saved meals</Text>
        <Pressable onPress={onClose} hitSlop={16} accessibilityLabel="Close saved meals" accessibilityRole="button">
          <MaterialCommunityIcons name="close" size={24} color={WarmHearthColors.textPrimary} />
        </Pressable>
      </View>

      {savedMeals.length === 0
        ? <EmptySavedState />
        : (
            <FlatList
              data={savedMeals}
              keyExtractor={m => m.id}
              renderItem={({ item }) => <SavedMealRow meal={item} />}
              contentContainerStyle={styles.list}
            />
          )}
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
