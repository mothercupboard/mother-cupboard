import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';

export type FormTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  errors: string[];
  isTouched: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  textContentType?: 'emailAddress' | 'newPassword' | 'password';
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
  accessibilityHint: string;
};

export function FormTextField({
  label,
  value,
  onChangeText,
  onBlur,
  errors,
  isTouched,
  keyboardType = 'default',
  textContentType,
  secureTextEntry,
  rightIcon,
  accessibilityHint,
}: FormTextFieldProps) {
  const hasError = isTouched && errors.length > 0;
  return (
    <View>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : undefined}
        autoCorrect={keyboardType === 'email-address' || keyboardType === 'numeric' ? false : undefined}
        keyboardType={keyboardType}
        textContentType={textContentType}
        secureTextEntry={secureTextEntry}
        mode="outlined"
        error={hasError}
        style={styles.input}
        right={rightIcon}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
      {hasError && (
        <HelperText type="error" visible>
          {String(errors[0])}
        </HelperText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: WarmHearthColors.surface },
});
