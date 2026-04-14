import type { MealSuggestion } from '../../../../../shared/types/meal-suggestion.types';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useShoppingListStore } from '@/features/shopping-list/shopping-list-store';

const ADVENTUROUSNESS_LABEL: Record<number, string> = {
  1: 'Simple',
  2: 'Easy',
  3: 'Moderate',
  4: 'Ambitious',
  5: 'Adventurous',
};

function MetaRow({ suggestion }: { suggestion: MealSuggestion }) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaItem}>
        <MaterialCommunityIcons name="timer-outline" size={18} color={WarmHearthColors.textSecondary} />
        <Text variant="bodyMedium" style={styles.metaText}>
          {suggestion.estimatedCookTime}
          {' min'}
        </Text>
      </View>
      <View style={styles.metaItem}>
        <MaterialCommunityIcons name="fire" size={18} color={WarmHearthColors.adventurous} />
        <Text variant="bodyMedium" style={[styles.metaText, { color: WarmHearthColors.adventurous }]}>
          {ADVENTUROUSNESS_LABEL[suggestion.adventurousness]}
        </Text>
      </View>
      {suggestion.usesExpiringItems && (
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="clock-alert-outline" size={18} color={WarmHearthColors.expiryWarning} />
          <Text variant="bodyMedium" style={[styles.metaText, { color: WarmHearthColors.expiryWarning }]}>
            Uses expiring
          </Text>
        </View>
      )}
    </View>
  );
}

function AddToListButton({ suggestion }: { suggestion: MealSuggestion }) {
  const addMissing = useShoppingListStore(s => s.addMissingIngredients);
  const [addedCount, setAddedCount] = useState<number | null>(null);

  function handlePress() {
    const count = addMissing(suggestion.missingIngredients, suggestion.id);
    setAddedCount(count);
  }

  if (addedCount !== null) {
    return (
      <View style={styles.addedBanner}>
        <MaterialCommunityIcons name="check" size={16} color={WarmHearthColors.shoppingList} />
        <Text variant="labelSmall" style={styles.addedText}>
          {addedCount > 0
            ? `${addedCount} item${addedCount !== 1 ? 's' : ''} added to shopping list`
            : 'Already on your shopping list'}
        </Text>
      </View>
    );
  }

  return (
    <Button
      mode="outlined"
      icon="cart-plus"
      onPress={handlePress}
      style={styles.addToListButton}
      labelStyle={styles.addToListLabel}
      textColor={WarmHearthColors.shoppingList}
      compact
    >
      Add missing to shopping list
    </Button>
  );
}

function IngredientsSection({ suggestion }: { suggestion: MealSuggestion }) {
  return (
    <View style={styles.section}>
      <Text variant="titleSmall" style={styles.sectionTitle}>Ingredients you have</Text>
      {suggestion.ingredients.map((ing, i) => (
        <View key={ing} style={styles.ingredientRow}>
          <Text variant="bodyMedium" style={styles.ingredientNumber}>
            {i + 1}
            .
          </Text>
          <Text variant="bodyMedium" style={styles.ingredientText}>{ing}</Text>
        </View>
      ))}

      {suggestion.missingIngredients.length > 0 && (
        <>
          <Text variant="titleSmall" style={styles.missingSectionTitle}>You might need</Text>
          <View style={styles.chipRow}>
            {suggestion.missingIngredients.map(ing => (
              <Chip key={ing} compact icon="cart-outline" style={styles.missingChip} textStyle={styles.chipText}>
                {ing}
              </Chip>
            ))}
          </View>
          <AddToListButton suggestion={suggestion} />
        </>
      )}
    </View>
  );
}

function MethodSteps({ suggestion }: { suggestion: MealSuggestion }) {
  if (!suggestion.steps || suggestion.steps.length === 0) {
    return (
      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>Method</Text>
        <View style={styles.placeholderBox}>
          <MaterialCommunityIcons name="chef-hat" size={28} color={WarmHearthColors.outline} />
          <Text variant="bodyMedium" style={styles.placeholderText}>
            No steps available for this recipe.
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <Text variant="titleSmall" style={styles.sectionTitle}>Method</Text>
      {suggestion.steps.map((step, i) => (
        <View key={String(i)} style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text variant="labelMedium" style={styles.stepNumberText}>{i + 1}</Text>
          </View>
          <Text variant="bodyMedium" style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Expanded full-screen view of a meal suggestion. Shows detailed
 * ingredient list, meta information, and a placeholder for step-by-step
 * cooking instructions (to be populated in a future story).
 */
export function FullRecipeSheet({ suggestion, onClose }: { onClose: () => void; suggestion: MealSuggestion }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.heading} numberOfLines={2}>
          {suggestion.title}
        </Text>
        <Pressable onPress={onClose} hitSlop={16} accessibilityLabel="Close recipe" accessibilityRole="button">
          <MaterialCommunityIcons name="close" size={24} color={WarmHearthColors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="bodyLarge" style={styles.description}>
          {suggestion.description}
        </Text>

        <MetaRow suggestion={suggestion} />

        <Divider style={styles.divider} />

        <IngredientsSection suggestion={suggestion} />

        <Divider style={styles.divider} />

        <MethodSteps suggestion={suggestion} />
      </ScrollView>
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
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heading: {
    color: WarmHearthColors.textPrimary,
    flex: 1,
    fontFamily: 'Nunito_700Bold',
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  description: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  metaText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  divider: {
    marginVertical: 4,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 4,
  },
  ingredientNumber: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    minWidth: 20,
  },
  ingredientText: {
    color: WarmHearthColors.textPrimary,
    flex: 1,
    fontFamily: 'Nunito_400Regular',
  },
  missingSectionTitle: {
    color: WarmHearthColors.shoppingList,
    fontFamily: 'Nunito_700Bold',
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  missingChip: {
    backgroundColor: '#E8EAF6',
  },
  chipText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
  },
  addToListButton: {
    borderColor: WarmHearthColors.shoppingList,
    borderRadius: 12,
    marginTop: 4,
  },
  addToListLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
  addedBanner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  addedText: {
    color: WarmHearthColors.shoppingList,
    fontFamily: 'Nunito_400Regular',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 4,
    marginBottom: 4,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: WarmHearthColors.primary,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    minWidth: 24,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
  },
  stepText: {
    color: WarmHearthColors.textPrimary,
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
  },
  placeholderBox: {
    alignItems: 'center',
    backgroundColor: WarmHearthColors.surface,
    borderColor: WarmHearthColors.outline,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  placeholderText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
});
