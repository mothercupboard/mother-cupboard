import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Checkbox, Dialog, Portal, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';

type Props = {
  visible: boolean;
  items: { id: string; name: string }[];
  onConfirm: (finishedIds: string[]) => void;
};

/**
 * Shown after cooking for whole/discrete produce we couldn't measure precisely
 * (e.g. a celery used "2 sticks" of). The user ticks anything they've used up
 * and we remove just those from the cupboard.
 */
export function CookedFinishDialog({ visible, items, onConfirm }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setChecked(c => ({ ...c, [id]: !c[id] }));
  }

  function done() {
    const finished = items.filter(i => checked[i.id]).map(i => i.id);
    setChecked({});
    onConfirm(finished);
  }

  return (
    <Portal>
      <Dialog visible={visible} dismissable={false}>
        <Dialog.Title style={{ fontFamily: 'Nunito_700Bold' }}>Did you finish these?</Dialog.Title>
        <Dialog.Content>
          <Text
            variant="bodyMedium"
            style={{ color: WarmHearthColors.textSecondary, fontFamily: 'Nunito_400Regular', marginBottom: 8 }}
          >
            We couldn&apos;t tell exactly how much was left. Tick anything you&apos;ve used up and we&apos;ll remove it from your cupboard. Leave the rest and we&apos;ll keep it.
          </Text>
          <ScrollView style={{ maxHeight: 260 }}>
            {items.map(i => (
              <Checkbox.Item
                key={i.id}
                label={i.name}
                status={checked[i.id] ? 'checked' : 'unchecked'}
                onPress={() => toggle(i.id)}
                position="leading"
                labelStyle={{ fontFamily: 'Nunito_400Regular', textAlign: 'left' }}
                color={WarmHearthColors.primary}
              />
            ))}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={done} labelStyle={{ fontFamily: 'Nunito_700Bold' }}>Done</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
