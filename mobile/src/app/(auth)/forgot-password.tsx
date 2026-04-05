import { useForm } from '@tanstack/react-form';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import z from 'zod';

import { FormTextField } from '@/components/common/form-text-field';
import { WarmHearthColors } from '@/components/common/paper-theme';
import { requestPasswordReset } from '@/features/auth/auth.service';

const emailSchema = z.string().email('Please enter a valid email address');

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await requestPasswordReset(value.email);
      if (result.error) {
        setServerError(result.error.message);
        return;
      }
      setSent(true);
    },
  });

  if (sent) {
    return (
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.heading}>Check your email</Text>
        <Text variant="bodyMedium" style={styles.subtext}>
          We've sent a password reset link to your email address. The link expires in 1 hour.
        </Text>
        <Button
          mode="contained"
          onPress={() => router.replace('/(auth)/login')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Back to sign in
        </Button>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="headlineMedium" style={styles.heading}>Forgot password?</Text>
      <Text variant="bodyMedium" style={styles.subtext}>
        Enter your email and we'll send you a link to reset your password.
      </Text>
      {serverError !== null && (
        <View style={styles.errorBanner}>
          <Text variant="bodyMedium" style={styles.errorText}>{serverError}</Text>
        </View>
      )}
      <form.Field
        name="email"
        validators={{
          onChangeAsyncDebounceMs: 300,
          onChange: ({ value }) => {
            if (!value)
              return undefined;
            const r = emailSchema.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
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
      <form.Subscribe selector={s => [s.canSubmit, s.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            mode="contained"
            onPress={form.handleSubmit}
            disabled={!canSubmit || isSubmitting}
            loading={isSubmitting}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        )}
      </form.Subscribe>
      <Text
        variant="bodyMedium"
        style={styles.backLink}
        onPress={() => router.back()}
        accessibilityRole="link"
      >
        Back to sign in
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: WarmHearthColors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  heading: {
    fontFamily: 'Nunito_700Bold',
    color: WarmHearthColors.textPrimary,
  },
  subtext: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
  },
  errorBanner: {
    backgroundColor: '#FDE8E8',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: WarmHearthColors.expiryUrgent,
  },
  errorText: { fontFamily: 'Nunito_400Regular', color: WarmHearthColors.expiryUrgent },
  button: { borderRadius: 12, marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
  buttonLabel: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  backLink: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
    textAlign: 'center',
  },
});
