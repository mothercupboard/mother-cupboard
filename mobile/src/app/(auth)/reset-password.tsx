import { useForm } from '@tanstack/react-form';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import z from 'zod';

import { FormTextField } from '@/components/common/form-text-field';
import { WarmHearthColors } from '@/components/common/paper-theme';
import { updatePassword } from '@/features/auth/auth.service';
import { supabase } from '@/lib/supabase/client';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

type ExchangeState = 'loading' | 'ready' | 'error';

function NewPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await updatePassword(value.password);
      if (result.error) {
        setServerError(result.error.message);
        return;
      }
      router.replace('/(tabs)');
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="headlineMedium" style={styles.heading}>Set new password</Text>
      <Text variant="bodyMedium" style={styles.subtext}>
        Choose a strong password of at least 8 characters.
      </Text>
      {serverError !== null && (
        <View style={styles.errorBanner}>
          <Text variant="bodyMedium" style={styles.errorText}>{serverError}</Text>
        </View>
      )}
      <form.Field
        name="password"
        validators={{
          onChangeAsyncDebounceMs: 300,
          onChange: ({ value }) => {
            if (!value)
              return undefined;
            const r = passwordSchema.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {field => (
          <FormTextField
            label="New password"
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            errors={field.state.meta.errors.map(String)}
            isTouched={field.state.meta.isTouched}
            secureTextEntry
            textContentType="newPassword"
            accessibilityHint="Must be at least 8 characters"
          />
        )}
      </form.Field>
      <form.Field
        name="confirmPassword"
        validators={{
          onChangeAsyncDebounceMs: 300,
          onChange: ({ value, fieldApi }) => {
            if (!value)
              return undefined;
            const password = fieldApi.form.getFieldValue('password');
            return value !== password ? 'Passwords do not match' : undefined;
          },
        }}
      >
        {field => (
          <FormTextField
            label="Confirm new password"
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            errors={field.state.meta.errors.map(String)}
            isTouched={field.state.meta.isTouched}
            secureTextEntry
            textContentType="newPassword"
            accessibilityHint="Re-enter your new password"
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
            {isSubmitting ? 'Saving…' : 'Set new password'}
          </Button>
        )}
      </form.Subscribe>
    </ScrollView>
  );
}

export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [state, setState] = useState<ExchangeState>('loading');
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setExchangeError('Invalid or expired reset link. Please request a new one.');
      setState('error');
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setExchangeError('This reset link has expired or already been used. Please request a new one.');
        setState('error');
      }
      else {
        setState('ready');
      }
    });
  }, [code]);

  if (state === 'loading') {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={WarmHearthColors.primary} />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.heading}>Link expired</Text>
        <Text variant="bodyMedium" style={styles.subtext}>{exchangeError}</Text>
        <Button
          mode="contained"
          onPress={() => router.replace('/(auth)/forgot-password')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Request a new link
        </Button>
      </View>
    );
  }

  return <NewPasswordForm />;
}

const styles = StyleSheet.create({
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WarmHearthColors.background,
  },
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
});
