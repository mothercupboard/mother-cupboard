import { useForm } from '@tanstack/react-form';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import z from 'zod';

import { FormTextField } from '@/components/common/form-text-field';
import { WarmHearthColors } from '@/components/common/paper-theme';
import { requestPasswordReset } from '@/features/auth/auth.service';
import { supabase } from '@/lib/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');

type Step = 'email' | 'code' | 'newPassword';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Request reset email
  const emailForm = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await requestPasswordReset(value.email);
      if (result.error) {
        setServerError(result.error.message);
        return;
      }
      setEmail(value.email);
      setStep('code');
    },
  });

  // Step 2: Verify the 6-digit code
  async function handleVerifyCode() {
    if (code.length < 6) {
      setServerError('Please enter the 6-digit code from your email.');
      return;
    }
    setServerError(null);
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'recovery',
    });
    setIsLoading(false);
    if (error) {
      setServerError('Invalid or expired code. Please check and try again.');
      return;
    }
    setStep('newPassword');
  }

  // Step 3: Set new password
  async function handleSetPassword() {
    if (newPassword.length < 8) {
      setServerError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setServerError('Passwords do not match.');
      return;
    }
    setServerError(null);
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);
    if (error) {
      setServerError('Failed to update password. Please try again.');
      return;
    }
    router.replace('/(tabs)');
  }

  if (step === 'newPassword') {
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
        <FormTextField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          onBlur={() => {}}
          errors={[]}
          isTouched={false}
          secureTextEntry
          textContentType="newPassword"
          accessibilityHint="Must be at least 8 characters"
        />
        <FormTextField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => {}}
          errors={[]}
          isTouched={false}
          secureTextEntry
          textContentType="newPassword"
          accessibilityHint="Re-enter your new password"
        />
        <Button
          mode="contained"
          onPress={handleSetPassword}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          {isLoading ? 'Saving…' : 'Set new password'}
        </Button>
      </ScrollView>
    );
  }

  if (step === 'code') {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text variant="headlineMedium" style={styles.heading}>Check your email</Text>
        <Text variant="bodyMedium" style={styles.subtext}>
          We've sent a 6-digit code to
          {' '}
          {email}
          . Enter it below to reset your password.
        </Text>
        {serverError !== null && (
          <View style={styles.errorBanner}>
            <Text variant="bodyMedium" style={styles.errorText}>{serverError}</Text>
          </View>
        )}
        <FormTextField
          label="6-digit code"
          value={code}
          onChangeText={setCode}
          onBlur={() => {}}
          errors={[]}
          isTouched={false}
          keyboardType="number-pad"
          accessibilityHint="Enter the 6-digit code from your email"
        />
        <Button
          mode="contained"
          onPress={handleVerifyCode}
          loading={isLoading}
          disabled={isLoading || code.length < 6}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          {isLoading ? 'Verifying…' : 'Verify code'}
        </Button>
        <Text
          variant="bodyMedium"
          style={styles.backLink}
          onPress={() => { setStep('email'); setServerError(null); setCode(''); }}
          accessibilityRole="link"
        >
          Didn't receive it? Go back and try again
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="headlineMedium" style={styles.heading}>Forgot password?</Text>
      <Text variant="bodyMedium" style={styles.subtext}>
        Enter your email and we'll send you a code to reset your password.
      </Text>
      {serverError !== null && (
        <View style={styles.errorBanner}>
          <Text variant="bodyMedium" style={styles.errorText}>{serverError}</Text>
        </View>
      )}
      <emailForm.Field
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
            autoComplete="email"
            accessibilityHint="Enter your email address"
          />
        )}
      </emailForm.Field>
      <emailForm.Subscribe selector={s => [s.canSubmit, s.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            mode="contained"
            onPress={emailForm.handleSubmit}
            disabled={!canSubmit || isSubmitting}
            loading={isSubmitting}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {isSubmitting ? 'Sending…' : 'Send reset code'}
          </Button>
        )}
      </emailForm.Subscribe>
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
