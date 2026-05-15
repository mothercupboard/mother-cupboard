import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput as PaperTextInput } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { parseDateGB } from '@/features/inventory/inventory.utils';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  errors?: string[];
  isTouched?: boolean;
  label?: string;
};

function formatDateGB(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(2);
  return `${d}/${m}/${y}`;
}

function parseInitialDate(value: string): Date {
  const ms = parseDateGB(value);
  if (ms !== null) return new Date(ms);
  // Default to tomorrow for new items
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * Expiry date field that opens a native date picker when tapped.
 * Displays the date in DD/MM/YY format and stores it as a string
 * compatible with parseDateGB().
 */
export function ExpiryDateField({ value, onChangeText, errors = [], isTouched = false, label = 'Expiry date' }: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => parseInitialDate(value));

  const hasError = isTouched && errors.length > 0;

  function handleOpen() {
    setPickerDate(parseInitialDate(value));
    setPickerVisible(true);
  }

  function handleConfirm() {
    onChangeText(formatDateGB(pickerDate));
    setPickerVisible(false);
  }

  function handleCancel() {
    setPickerVisible(false);
  }

  return (
    <>
      <Pressable onPress={handleOpen}>
        <View pointerEvents="none">
          <PaperTextInput
            label={label}
            value={value}
            mode="outlined"
            editable={false}
            right={<PaperTextInput.Icon icon="calendar" />}
            style={styles.input}
            outlineColor={hasError ? WarmHearthColors.expiryUrgent : WarmHearthColors.outline}
            activeOutlineColor={WarmHearthColors.primary}
            theme={{ fonts: { bodyLarge: { fontFamily: 'Nunito_400Regular' } } }}
          />
        </View>
      </Pressable>
      {hasError && (
        <Text variant="bodySmall" style={styles.errorText}>{errors[0]}</Text>
      )}
      <Portal>
        <Dialog visible={pickerVisible} onDismiss={handleCancel}>
          <Dialog.Title style={styles.dialogTitle}>{label}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event, date) => {
                if (date) setPickerDate(date);
              }}
              minimumDate={new Date()}
              locale="en-GB"
              style={styles.picker}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancel}>Cancel</Button>
            <Button onPress={handleConfirm}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: WarmHearthColors.background,
    fontSize: 15,
  },
  errorText: {
    color: WarmHearthColors.expiryUrgent,
    fontFamily: 'Nunito_400Regular',
    marginTop: -4,
  },
  dialogTitle: {
    fontFamily: 'Nunito_700Bold',
  },
  dialogContent: {
    alignItems: 'center',
  },
  picker: {
    width: '100%',
  },
});
