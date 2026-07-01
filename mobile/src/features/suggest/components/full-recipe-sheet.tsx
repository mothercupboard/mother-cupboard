import type { MealSuggestion } from '../../../../../shared/types/meal-suggestion.types';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useInventoryItems } from '@/features/inventory/use-inventory-items';
import { useNotificationStore } from '@/features/notifications/notification-store';
import { frozenItemsUsedByRecipe, scheduleDefrostReminder } from '@/features/notifications/schedule-defrost-reminder';
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
    const toAdd = [
      ...suggestion.missingIngredients,
      ...(suggestion.insufficientIngredients ?? []),
    ];
    const count = addMissing(toAdd, suggestion.id);
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

function DefrostReminder({ suggestion }: { suggestion: MealSuggestion }) {
  const frozen = useInventoryItems('freezer');
  const alertHour = useNotificationStore(s => s.alertHour);
  const [state, setState] = useState<'idle' | 'set' | 'denied'>('idle');

  const names = frozenItemsUsedByRecipe(frozen, suggestion.ingredients);
  if (names.length === 0) return null;

  const label = names.length === 1 ? names[0] : `${names.length} frozen items`;

  async function handlePress() {
    const result = await scheduleDefrostReminder(names, alertHour);
    setState(result === 'scheduled' ? 'set' : 'denied');
  }

  if (state === 'set') {
    return (
      <View style={styles.defrostBanner}>
        <MaterialCommunityIcons name="check-circle-outline" size={18} color={WarmHearthColors.primary} />
        <Text variant="bodyMedium" style={styles.defrostBannerText}>
          We’ll remind you tomorrow morning to take {names.length === 1 ? 'it' : 'them'} out to defrost.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.defrostCard}>
      <View style={styles.defrostHeader}>
        <MaterialCommunityIcons name="snowflake" size={18} color={WarmHearthColors.primary} />
        <Text variant="bodyMedium" style={styles.defrostText}>
          This uses {label} from your freezer — {names.length === 1 ? 'it needs' : 'they need'} defrosting first.
        </Text>
      </View>
      <Button
        mode="outlined"
        icon="bell-outline"
        onPress={handlePress}
        style={styles.defrostButton}
        labelStyle={styles.defrostButtonLabel}
        textColor={WarmHearthColors.primary}
        compact
      >
        Remind me in the morning
      </Button>
      {state === 'denied' && (
        <Text variant="bodySmall" style={styles.defrostDenied}>
          Turn on notifications in Settings to get defrost reminders.
        </Text>
      )}
    </View>
  );
}

function EquipmentSection({ suggestion }: { suggestion: MealSuggestion }) {
  if (!suggestion.equipment || suggestion.equipment.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text variant="titleSmall" style={styles.sectionTitle}>Equipment needed</Text>
      <View style={styles.chipRow}>
        {suggestion.equipment.map(item => (
          <Chip
            key={item}
            compact
            icon="pot-mix-outline"
            style={styles.equipmentChip}
            textStyle={styles.chipText}
          >
            {item}
          </Chip>
        ))}
      </View>
    </View>
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

      {(suggestion.insufficientIngredients ?? []).length > 0 && (
        <>
          <Text variant="titleSmall" style={styles.insufficientSectionTitle}>Need more of</Text>
          <View style={styles.chipRow}>
            {(suggestion.insufficientIngredients ?? []).map(ing => (
              <Chip key={ing} compact icon="plus-circle-outline" style={styles.insufficientChip} textStyle={styles.chipText}>
                {ing}
              </Chip>
            ))}
          </View>
        </>
      )}

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
        </>
      )}

      {((suggestion.insufficientIngredients ?? []).length > 0 || suggestion.missingIngredients.length > 0) && (
        <AddToListButton suggestion={suggestion} />
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
  const insets = useSafeAreaInsets();

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

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 40, 80) }]}>
        <Text variant="bodyLarge" style={styles.description}>
          {suggestion.description}
        </Text>

        <MetaRow suggestion={suggestion} />

        <DefrostReminder suggestion={suggestion} />

        <Divider style={styles.divider} />

        <EquipmentSection suggestion={suggestion} />

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
  insufficientSectionTitle: {
    color: WarmHearthColors.expiryWarning,
    fontFamily: 'Nunito_700Bold',
    marginTop: 8,
  },
  insufficientChip: {
    backgroundColor: '#FFF8E1',
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
  equipmentChip: {
    backgroundColor: '#FFF3E0',
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
  defrostCard: {
    backgroundColor: WarmHearthColors.surface,
    borderColor: WarmHearthColors.primary,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  defrostHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  defrostText: {
    color: WarmHearthColors.textPrimary,
    flex: 1,
    fontFamily: 'Nunito_600SemiBold',
  },
  defrostButton: {
    alignSelf: 'flex-start',
    borderColor: WarmHearthColors.primary,
    borderRadius: 12,
  },
  defrostButtonLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
  defrostDenied: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  defrostBanner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  defrostBannerText: {
    color: WarmHearthColors.primary,
    flex: 1,
    fontFamily: 'Nunito_600SemiBold',
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
