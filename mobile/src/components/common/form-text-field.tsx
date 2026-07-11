import { StyleSheet, Text, TextInput, View } from 'react-native';

import { WarmHearthColors } from '@/components/common/paper-theme';

export type FormTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  errors: string[];
  isTouched: boolean;
  // 'ascii-capable' is iOS-only: forces a full letters keyboard. Android falls
  // back to 'default'. Use it on password fields — iOS sometimes shows a digit
  // keypad on secureTextEntry fields otherwise.
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'decimal-pad' | 'number-pad' | 'ascii-capable';
  textContentType?: 'emailAddress' | 'newPassword' | 'password';
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
  accessibilityHint: string;
  autoComplete?: 'email' | 'password' | 'new-password' | 'off';
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
  accessibilityHint,
  autoComplete,
}: FormTextFieldProps) {
  const hasError = isTouched && errors.length > 0;
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        autoCapitalize={keyboardType === 'default' && !secureTextEntry ? 'sentences' : 'none'}
        autoCorrect={keyboardType !== 'email-address' && keyboardType !== 'numeric'}
        keyboardType={keyboardType}
        textContentType={textContentType}
        secureTextEntry={secureTextEntry}
        style={[styles.input, hasError && styles.inputError]}
        placeholderTextColor={WarmHearthColors.textSecondary}
        accessibilityLabel={label}
        autoComplete={autoComplete}
        accessibilityHint={accessibilityHint}
      />
      {hasError && (
        <Text style={styles.errorText}>{String(errors[0])}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  label: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
  input: {
    backgroundColor: WarmHearthColors.surface,
    borderColor: WarmHearthColors.outline,
    borderRadius: 8,
    borderWidth: 1,
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: WarmHearthColors.expiryUrgent,
  },
  errorText: {
    color: WarmHearthColors.expiryUrgent,
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
  },
});
