import { useForm } from '@tanstack/react-form';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import z from 'zod';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useAuthStore } from '@/features/auth/auth-store';
import { signUp } from '@/features/auth/auth.service';
import { supabase } from '@/lib/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  errors: string[];
  isTouched: boolean;
  keyboardType?: 'email-address' | 'default';
  textContentType?: 'emailAddress' | 'newPassword';
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
  accessibilityHint: string;
};

function FormTextField({
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
}: TextFieldProps) {
  const hasError = isTouched && errors.length > 0;
  return (
    <View>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : undefined}
        autoCorrect={keyboardType === 'email-address' ? false : undefined}
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
      {hasError && <HelperText type="error" visible>{String(errors[0])}</HelperText>}
    </View>
  );
}

export function RegisterForm() {
  const setSession = useAuthStore(s => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await signUp(value.email, value.password);
      if (result.error) {
        setServerError(result.error.message);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      router.replace('/(tabs)');
    },
  });

  return (
    <View style={styles.formContainer}>
      {serverError !== null && (
        <View style={styles.errorBanner}>
          <Text variant="bodyMedium" style={styles.errorText}>{serverError}</Text>
        </View>
      )}
      <form.Field
        name="email"
        validators={{ onChangeAsyncDebounceMs: 300, onChange: ({ value }) => {
          if (!value)
            return undefined;
          const r = emailSchema.safeParse(value);
          return r.success ? undefined : r.error.issues[0]?.message;
        } }}
      >
        {field => (
          <FormTextField
            label="Email address"
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            errors={field.state.meta.errors.map(String)}
            isTouched={field.state.meta.isTouched}
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityHint="Enter your email address"
          />
        )}
      </form.Field>
      <form.Field
        name="password"
        validators={{ onChangeAsyncDebounceMs: 300, onChange: ({ value }) => {
          if (!value)
            return undefined;
          const r = passwordSchema.safeParse(value);
          return r.success ? undefined : r.error.issues[0]?.message;
        } }}
      >
        {field => (
          <FormTextField
            label="Password"
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            errors={field.state.meta.errors.map(String)}
            isTouched={field.state.meta.isTouched}
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            accessibilityHint="Must be at least 8 characters"
            rightIcon={(
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(p => !p)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              />
            )}
          />
        )}
      </form.Field>
      <form.Subscribe selector={s => [s.canSubmit, s.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            mode="contained"
            onPress={form.handleSubmit}
            disabled={!canSubmit || isSubmitting}
            loading={isSubmitting}
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            accessibilityLabel="Create account"
            accessibilityRole="button"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        )}
      </form.Subscribe>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: { gap: 16 },
  errorBanner: { backgroundColor: '#FDE8E8', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: WarmHearthColors.expiryUrgent },
  errorText: { fontFamily: 'Nunito_400Regular', color: WarmHearthColors.expiryUrgent },
  input: { backgroundColor: WarmHearthColors.surface },
  submitButton: { borderRadius: 12, marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
  buttonLabel: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
