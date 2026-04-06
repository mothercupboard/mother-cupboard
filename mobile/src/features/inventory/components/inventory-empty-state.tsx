import type { ItemLocation } from '@/lib/database/models/inventory-item';

import { MotiView } from 'moti';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';

const EMPTY_CONFIG: Record<ItemLocation, { copy: string; emoji: string }> = {
  cupboard: {
    copy: 'Nothing in your cupboard yet — add your first item to get started.',
    emoji: '🫙',
  },
  freezer: {
    copy: 'Your freezer\'s looking empty — anything hiding in there?',
    emoji: '❄️',
  },
  fridge: {
    copy: 'Your fridge is looking bare — pop something in when you\'re next shopping.',
    emoji: '🥦',
  },
};

export function InventoryEmptyState({ location }: { location: ItemLocation }) {
  const { emoji, copy } = EMPTY_CONFIG[location];
  return (
    <View style={styles.container}>
      <MotiView
        from={{ opacity: 0.6, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1800, loop: true, repeatReverse: true, type: 'timing' }}
      >
        <Text style={styles.emoji}>{emoji}</Text>
      </MotiView>
      <Text variant="bodyMedium" style={styles.copy}>{copy}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 32,
  },
  emoji: { fontSize: 64 },
  copy: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
    textAlign: 'center',
  },
});
