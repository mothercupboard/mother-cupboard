import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { Button, Dialog, Divider, Portal, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { FeatureTip } from '@/features/onboarding/components/feature-tip';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { AddItemInput } from '@/features/shopping-list/components/add-item-input';
import { ShoppingListItemRow } from '@/features/shopping-list/components/shopping-list-item-row';
import { useShoppingListStore } from '@/features/shopping-list/shopping-list-store';

function ProgressHeader({ total, purchased }: { purchased: number; total: number }) {
  if (total === 0)
    return null;

  const allDone = purchased === total;

  return (
    <View style={styles.progressHeader}>
      <MaterialCommunityIcons
        name={allDone ? 'check-circle' : 'cart-outline'}
        size={18}
        color={allDone ? WarmHearthColors.success : WarmHearthColors.shoppingList}
      />
      <Text variant="labelLarge" style={[styles.progressText, allDone && styles.progressDone]}>
        {allDone
          ? 'All purchased!'
          : `${purchased} of ${total} purchased`}
      </Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="labelMedium" style={styles.sectionLabel}>{title}</Text>
    </View>
  );
}

function ClearConfirmDialog(
  { visible, count, onDismiss, onConfirm }:
  { count: number; onConfirm: () => void; onDismiss: () => void; visible: boolean },
) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title style={dialogStyles.title}>Clear purchased items?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={dialogStyles.text}>
            {`This will clear ${count} purchased item${count !== 1 ? 's' : ''} from your list. You can re-add them any time.`}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={onConfirm} textColor={WarmHearthColors.shoppingList}>
            Clear
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const dialogStyles = StyleSheet.create({
  title: { fontFamily: 'Nunito_700Bold' },
  text: { fontFamily: 'Nunito_400Regular' },
});

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="format-list-bulleted"
        size={48}
        color={WarmHearthColors.outline}
      />
      <Text variant="bodyLarge" style={styles.emptyTitle}>
        Your shopping list is empty
      </Text>
      <Text variant="bodyMedium" style={styles.emptyBody}>
        {'Add items above, or they\u2019ll appear here automatically when a meal suggestion has missing ingredients.'}
      </Text>
    </View>
  );
}

function ListActions() {
  const items = useShoppingListStore(s => s.items);
  const checkAll = useShoppingListStore(s => s.checkAll);
  const uncheckAll = useShoppingListStore(s => s.uncheckAll);
  const clearChecked = useShoppingListStore(s => s.clearChecked);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const checkedCount = items.filter(i => i.checked).length;
  const allChecked = items.length > 0 && checkedCount === items.length;

  if (items.length === 0)
    return null;

  return (
    <View style={styles.actionsRow}>
      <Button
        mode="text"
        icon={allChecked ? 'checkbox-blank-outline' : 'check-all'}
        onPress={allChecked ? uncheckAll : checkAll}
        labelStyle={styles.actionLabel}
        textColor={WarmHearthColors.textSecondary}
        compact
      >
        {allChecked ? 'Uncheck all' : 'Check all'}
      </Button>

      {checkedCount > 0 && (
        <>
          <Button
            mode="text"
            icon="delete-sweep-outline"
            onPress={() => setConfirmVisible(true)}
            labelStyle={styles.actionLabel}
            textColor={WarmHearthColors.shoppingList}
            compact
          >
            {`Clear purchased (${checkedCount})`}
          </Button>
          <ClearConfirmDialog
            visible={confirmVisible}
            count={checkedCount}
            onDismiss={() => setConfirmVisible(false)}
            onConfirm={() => {
              clearChecked();
              setConfirmVisible(false);
            }}
          />
        </>
      )}
    </View>
  );
}

export default function ShoppingListScreen() {
  const items = useShoppingListStore(s => s.items);
  const tipSeen = useOnboardingStore(s => s.shoppingTipSeen);
  const dismissTip = useOnboardingStore(s => s.dismissTip);

  const { sections, purchasedCount } = useMemo(() => {
    const pending = items
      .filter(i => !i.checked)
      .sort((a, b) => a.createdAt - b.createdAt);
    const purchased = items
      .filter(i => i.checked)
      .sort((a, b) => a.createdAt - b.createdAt);

    const result = [];
    if (pending.length > 0)
      result.push({ title: 'To buy', data: pending });
    if (purchased.length > 0)
      result.push({ title: 'Purchased', data: purchased });

    return { sections: result, purchasedCount: purchased.length };
  }, [items]);

  return (
    <View style={styles.container}>
      {!tipSeen && (
        <FeatureTip
          icon="cart-outline"
          title="Your shopping list"
          body={'Add items manually, or they\u2019ll appear here automatically when a meal suggestion needs ingredients you don\u2019t have.'}
          onDismiss={() => dismissTip('shoppingTipSeen')}
        />
      )}

      <AddItemInput />
      <Divider />
      <ProgressHeader total={items.length} purchased={purchasedCount} />

      {items.length === 0
        ? <EmptyState />
        : (
            <>
              <SectionList
                sections={sections}
                keyExtractor={i => i.id}
                renderItem={({ item }) => <ShoppingListItemRow item={item} />}
                renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
                contentContainerStyle={styles.list}
                stickySectionHeadersEnabled={false}
              />
              <ListActions />
            </>
          )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WarmHearthColors.background,
    flex: 1,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  progressText: {
    color: WarmHearthColors.shoppingList,
    fontFamily: 'Nunito_600SemiBold',
  },
  progressDone: {
    color: WarmHearthColors.success,
  },
  sectionHeader: {
    backgroundColor: WarmHearthColors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase',
  },
  list: {
    paddingBottom: 16,
  },
  actionsRow: {
    borderTopColor: WarmHearthColors.outline,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  actionLabel: {
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
