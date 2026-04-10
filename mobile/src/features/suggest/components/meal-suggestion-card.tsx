import type { MealSuggestion } from '../../../../../shared/types/meal-suggestion.types';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, Portal, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useShoppingListStore } from '@/features/shopping-list/shopping-list-store';
import { useSavedMealsStore } from '@/features/suggest/saved-meals-store';
import { useMarkAsCooked } from '@/features/suggest/use-mark-as-cooked';

const ADVENTUROUSNESS_LABEL: Record<number, string> = {
  1: 'Simple',
  2: 'Easy',
  3: 'Moderate',
  4: 'Ambitious',
  5: 'Adventurous',
};

function AdventurousnessBadge({ level }: { level: number }) {
  return (
    <View style={styles.advBadge}>
      {Array.from({ length: level }, (_, i) => (
        <MaterialCommunityIcons
          key={i}
          name="fire"
          size={14}
          color={WarmHearthColors.adventurous}
        />
      ))}
      <Text variant="labelSmall" style={styles.advLabel}>
        {ADVENTUROUSNESS_LABEL[level] ?? `Level ${level}`}
      </Text>
    </View>
  );
}

function CookedConfirmDialog(
  { visible, ingredients, isMarking, onDismiss, onConfirm }:
  {
    ingredients: string[];
    isMarking: boolean;
    onConfirm: () => void;
    onDismiss: () => void;
    visible: boolean;
  },
) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={isMarking ? () => {} : onDismiss}>
        <Dialog.Title style={dialogStyles.title}>Mark as cooked?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={dialogStyles.text}>
            {"We\u2019ll update your cupboard to show these items have been used:"}
          </Text>
          <View style={dialogStyles.list}>
            {ingredients.map(ing => (
              <Text key={ing} variant="bodyMedium" style={dialogStyles.item}>
                {'• '}
                {ing}
              </Text>
            ))}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={isMarking}>Cancel</Button>
          <Button
            onPress={onConfirm}
            loading={isMarking}
            disabled={isMarking}
            textColor={WarmHearthColors.success}
          >
            Cooked it!
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const dialogStyles = StyleSheet.create({
  title: { fontFamily: 'Nunito_700Bold' },
  text: { fontFamily: 'Nunito_400Regular' },
  list: { gap: 2, marginTop: 8 },
  item: { color: WarmHearthColors.textPrimary, fontFamily: 'Nunito_400Regular' },
});

function CookedBanner({ removedCount, addedToListCount }: { addedToListCount: number; removedCount: number }) {
  return (
    <View style={styles.cookedBanner}>
      <MaterialCommunityIcons name="check-circle" size={20} color={WarmHearthColors.success} />
      <View style={styles.cookedTextCol}>
        <Text variant="labelMedium" style={styles.cookedText}>
          Cooked!
          {removedCount > 0 && ` ${removedCount} item${removedCount !== 1 ? 's' : ''} removed from cupboard.`}
        </Text>
        {addedToListCount > 0 && (
          <Text variant="labelSmall" style={styles.shoppingAddedText}>
            {`${addedToListCount} missing ingredient${addedToListCount !== 1 ? 's' : ''} added to shopping list.`}
          </Text>
        )}
      </View>
    </View>
  );
}

function CardIngredients({ suggestion }: { suggestion: MealSuggestion }) {
  return (
    <>
      <Text variant="labelMedium" style={styles.sectionLabel}>Ingredients you have</Text>
      <View style={styles.chipRow}>
        {suggestion.ingredients.map(ing => (
          <Chip key={ing} compact style={styles.ingredientChip} textStyle={styles.chipText}>
            {ing}
          </Chip>
        ))}
      </View>

      {suggestion.missingIngredients.length > 0 && (
        <>
          <Text variant="labelMedium" style={styles.missingLabel}>You might need</Text>
          <View style={styles.chipRow}>
            {suggestion.missingIngredients.map(ing => (
              <Chip key={ing} compact icon="cart-outline" style={styles.missingChip} textStyle={styles.chipText}>
                {ing}
              </Chip>
            ))}
          </View>
        </>
      )}
    </>
  );
}

function SaveButton({ suggestion }: { suggestion: MealSuggestion }) {
  const saved = useSavedMealsStore(s => s.isSaved(suggestion.id));
  const saveMeal = useSavedMealsStore(s => s.saveMeal);
  const unsaveMeal = useSavedMealsStore(s => s.unsaveMeal);

  return (
    <Button
      mode="text"
      compact
      onPress={() => saved ? unsaveMeal(suggestion.id) : saveMeal(suggestion)}
      icon={saved ? 'bookmark' : 'bookmark-outline'}
      textColor={saved ? WarmHearthColors.primary : WarmHearthColors.textSecondary}
      labelStyle={styles.saveLabel}
    >
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
}

function FavouriteButton({ suggestion }: { suggestion: MealSuggestion }) {
  const isFav = useSavedMealsStore(s => s.isFavourite(suggestion.id));
  const favouriteMeal = useSavedMealsStore(s => s.favouriteMeal);
  const unfavouriteMeal = useSavedMealsStore(s => s.unfavouriteMeal);

  return (
    <Pressable
      onPress={() => isFav ? unfavouriteMeal(suggestion.id) : favouriteMeal(suggestion)}
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
  );
}

type CardProps = {
  suggestion: MealSuggestion;
  onViewRecipe?: (suggestion: MealSuggestion) => void;
};

export function MealSuggestionCard({ suggestion, onViewRecipe }: CardProps) {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [cooked, setCooked] = useState(false);
  const [removedCount, setRemovedCount] = useState(0);
  const [addedToListCount, setAddedToListCount] = useState(0);
  const { isMarking, markAsCooked } = useMarkAsCooked();
  const recordCooked = useSavedMealsStore(s => s.recordCooked);
  const addMissing = useShoppingListStore(s => s.addMissingIngredients);

  async function handleConfirm() {
    const count = await markAsCooked(suggestion.ingredients);
    setRemovedCount(count);
    setCooked(true);
    setDialogVisible(false);
    recordCooked(suggestion);

    if (suggestion.missingIngredients.length > 0) {
      const added = addMissing(suggestion.missingIngredients, suggestion.id);
      setAddedToListCount(added);
    }
  }

  return (
    <View style={[styles.card, cooked && styles.cardCooked]}>
      <View style={styles.headerRow}>
        <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
          {suggestion.title}
        </Text>
        {suggestion.usesExpiringItems && (
          <Chip compact icon="clock-alert-outline" style={styles.expiryChip} textStyle={styles.expiryChipText}>
            Uses expiring
          </Chip>
        )}
      </View>

      <Text variant="bodyMedium" style={styles.description}>
        {suggestion.description}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="timer-outline" size={16} color={WarmHearthColors.textSecondary} />
          <Text variant="bodySmall" style={styles.metaText}>
            {suggestion.estimatedCookTime}
            {' '}
            min
          </Text>
        </View>
        <AdventurousnessBadge level={suggestion.adventurousness} />
      </View>

      <CardIngredients suggestion={suggestion} />

      {onViewRecipe && (
        <Pressable
          onPress={() => onViewRecipe(suggestion)}
          accessibilityRole="button"
          accessibilityLabel={`View full recipe for ${suggestion.title}`}
        >
          <Text variant="labelMedium" style={styles.viewRecipeLink}>
            View full recipe →
          </Text>
        </Pressable>
      )}

      {cooked
        ? <CookedBanner removedCount={removedCount} addedToListCount={addedToListCount} />
        : (
            <View style={styles.actionRow}>
              <Button
                mode="contained"
                onPress={() => setDialogVisible(true)}
                icon="pot-steam-outline"
                style={styles.cookedButton}
                labelStyle={styles.cookedButtonLabel}
                buttonColor={WarmHearthColors.success}
              >
                Cooked it!
              </Button>
              <SaveButton suggestion={suggestion} />
              <FavouriteButton suggestion={suggestion} />
            </View>
          )}

      <CookedConfirmDialog
        visible={dialogVisible}
        ingredients={suggestion.ingredients}
        isMarking={isMarking}
        onDismiss={() => setDialogVisible(false)}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WarmHearthColors.surface,
    borderRadius: 12,
    elevation: 2,
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    shadowColor: '#D4673A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardCooked: {
    borderColor: WarmHearthColors.success,
    borderWidth: 1,
    opacity: 0.85,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  title: {
    color: WarmHearthColors.textPrimary,
    flex: 1,
    fontFamily: 'Nunito_700Bold',
  },
  expiryChip: {
    backgroundColor: '#FFF3E0',
  },
  expiryChipText: {
    color: '#B07800', // Darkened amber — 4.6:1 contrast on #FFF3E0 (WCAG AA)
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
  },
  description: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  metaText: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  advBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  advLabel: {
    color: WarmHearthColors.adventurous,
    fontFamily: 'Nunito_600SemiBold',
    marginLeft: 2,
  },
  sectionLabel: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
    marginTop: 4,
  },
  missingLabel: {
    color: WarmHearthColors.shoppingList,
    fontFamily: 'Nunito_600SemiBold',
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientChip: {
    backgroundColor: '#E8F5E9',
  },
  missingChip: {
    backgroundColor: '#E8EAF6',
  },
  chipText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
  },
  viewRecipeLink: {
    color: WarmHearthColors.primary,
    fontFamily: 'Nunito_600SemiBold',
    marginTop: 2,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cookedButton: {
    borderRadius: 12,
    flex: 1,
  },
  saveLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
  cookedButtonLabel: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
  cookedBanner: {
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cookedTextCol: {
    flex: 1,
    gap: 2,
  },
  cookedText: {
    color: WarmHearthColors.success,
    fontFamily: 'Nunito_600SemiBold',
  },
  shoppingAddedText: {
    color: WarmHearthColors.shoppingList,
    fontFamily: 'Nunito_400Regular',
  },
});
