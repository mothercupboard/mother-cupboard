import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, HelperText, Portal, Text, TextInput } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { DEFAULT_STAPLES, useStaplesStore } from '@/features/suggest/staples-store';

/**
 * Settings → Kitchen Staples
 *
 * Staples are ingredients the user always has on hand (salt, oil, herbs, …).
 * When a recipe is marked as cooked, these are skipped during deduction so the
 * user doesn't have to maintain them in their inventory.
 */
export default function StaplesScreen() {
  const enabled = useStaplesStore(s => s.enabled);
  const addStaple = useStaplesStore(s => s.addStaple);
  const removeStaple = useStaplesStore(s => s.removeStaple);
  const resetToDefaults = useStaplesStore(s => s.resetToDefaults);

  const [draft, setDraft] = useState('');
  const [resetDialogVisible, setResetDialogVisible] = useState(false);

  const trimmed = draft.trim();
  const isDuplicate = trimmed.length > 0
    && enabled.some(s => s.trim().toLowerCase() === trimmed.toLowerCase());
  const canAdd = trimmed.length > 0 && !isDuplicate;

  function handleAdd() {
    if (!canAdd)
      return;
    addStaple(trimmed);
    setDraft('');
  }

  function isDefault(keyword: string): boolean {
    return DEFAULT_STAPLES.some(d => d.toLowerCase() === keyword.toLowerCase());
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.intro}>
        <Text variant="bodyMedium" style={styles.introText}>
          Staples are ingredients you always have. They're skipped when a meal is
          marked as cooked, so you don't have to keep them in your cupboard.
        </Text>
        <Text variant="bodySmall" style={styles.helpText}>
          Matching is case-insensitive and uses substrings — adding "butter" will
          match "salted butter" and "unsalted butter" too.
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.sectionHeading}>
          Your staples
        </Text>
        {enabled.length === 0
          ? (
              <Text variant="bodySmall" style={styles.emptyText}>
                No staples yet — every ingredient will be deducted when you cook.
              </Text>
            )
          : (
              <View style={styles.chipRow}>
                {enabled.map(keyword => (
                  <Chip
                    key={keyword}
                    onClose={() => removeStaple(keyword)}
                    closeIcon="close"
                    style={[styles.chip, !isDefault(keyword) && styles.customChip]}
                    textStyle={styles.chipText}
                  >
                    {keyword.trim()}
                  </Chip>
                ))}
              </View>
            )}
      </View>

      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.sectionHeading}>
          Add a staple
        </Text>
        <View style={styles.addRow}>
          <TextInput
            mode="outlined"
            value={draft}
            onChangeText={setDraft}
            placeholder="e.g. butter, eggs, flour"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            style={styles.input}
            outlineColor={WarmHearthColors.outline}
            activeOutlineColor={WarmHearthColors.primary}
          />
          <Button
            mode="contained"
            onPress={handleAdd}
            disabled={!canAdd}
            style={styles.addButton}
            labelStyle={styles.addButtonLabel}
          >
            Add
          </Button>
        </View>
        {isDuplicate && (
          <HelperText type="info" visible>
            "
            {trimmed}
            " is already in your list.
          </HelperText>
        )}
      </View>

      <View style={styles.section}>
        <Button
          mode="outlined"
          icon="restore"
          onPress={() => setResetDialogVisible(true)}
          style={styles.resetButton}
          labelStyle={styles.resetButtonLabel}
        >
          Reset to defaults
        </Button>
      </View>

      <Portal>
        <Dialog visible={resetDialogVisible} onDismiss={() => setResetDialogVisible(false)}>
          <Dialog.Title>Reset to defaults?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              This will replace your current list with the built-in defaults
              (salt, pepper, oil, herbs, stock, etc.). Any custom staples you've
              added will be removed.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={() => {
                resetToDefaults();
                setResetDialogVisible(false);
              }}
            >
              Reset
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: WarmHearthColors.background,
    padding: 16,
    gap: 8,
  },
  intro: {
    paddingBottom: 8,
    gap: 6,
  },
  introText: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textPrimary,
  },
  helpText: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
  },
  section: {
    paddingVertical: 12,
    gap: 8,
  },
  sectionHeading: {
    fontFamily: 'Nunito_600SemiBold',
    color: WarmHearthColors.textPrimary,
  },
  emptyText: {
    fontFamily: 'Nunito_400Regular_Italic',
    color: WarmHearthColors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F0EAE4', // matches theme surfaceVariant
  },
  customChip: {
    backgroundColor: '#FFD9C5', // matches theme primaryContainer — custom adds stand out
  },
  chipText: {
    fontFamily: 'Nunito_400Regular',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: WarmHearthColors.background,
  },
  addButton: {
    borderRadius: 12,
  },
  addButtonLabel: {
    fontFamily: 'Nunito_600SemiBold',
  },
  resetButton: {
    borderRadius: 12,
    borderColor: WarmHearthColors.outline,
  },
  resetButtonLabel: {
    fontFamily: 'Nunito_600SemiBold',
    color: WarmHearthColors.textSecondary,
  },
  dialogText: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textPrimary,
  },
});
