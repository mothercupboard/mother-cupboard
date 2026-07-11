import type { ComponentRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';

import { useForm } from '@tanstack/react-form';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import z from 'zod';

import { FormTextField } from '@/components/common/form-text-field';
import { WarmHearthColors } from '@/components/common/paper-theme';
import { useAuthStore } from '@/features/auth/auth-store';
import { signIn } from '@/features/auth/auth.service';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(1, 'Password is required');

export function LoginForm() {
  const setSession = useAuthStore(s => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pwDialogVisible, setPwDialogVisible] = useState(false);
  const [pwDraft, setPwDraft] = useState('');
  // Paper's TextInput ref must satisfy both RN's TextInput and Paper's own
  // handle type, hence the intersection.
  const pwInputRef = useRef<RNTextInput & ComponentRef<typeof TextInput>>(null);

  // Focus the dialog's input as soon as the bubble opens. Without this the
  // keyboard stays attached to whichever field was focused behind the dialog,
  // so keystrokes land on the page underneath. autoFocus alone is unreliable
  // inside a Paper Dialog (it fires before the open animation finishes), and a
  // single delayed focus() can still be swallowed by the animation on iOS —
  // so retry until the input reports focus.
  useEffect(() => {
    if (!pwDialogVisible)
      return;
    const timers = [50, 200, 450, 800].map(ms =>
      setTimeout(() => {
        const input = pwInputRef.current;
        if (input && !input.isFocused())
          input.focus();
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [pwDialogVisible]);

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await signIn(value.email, value.password);
      if (result.error) {
        setServerError(result.error.message);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      // Persist email separately so it survives session expiry
      if (value.email)
        storage.set('user-email', value.email);
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
      </form.Field>
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
          <>
            <Pressable onPress={() => { Keyboard.dismiss(); setPwDraft(field.state.value); setPwDialogVisible(true); }}>
              <View pointerEvents="none">
                <FormTextField
                  label="Password"
                  value={field.state.value ? '••••••••' : ''}
                  onChangeText={() => {}}
                  onBlur={() => {}}
                  errors={field.state.meta.errors.map(String)}
                  isTouched={field.state.meta.isTouched}
                  accessibilityHint="Tap to enter your password"
                />
              </View>
            </Pressable>
            <Portal>
              <Dialog visible={pwDialogVisible} onDismiss={() => setPwDialogVisible(false)}>
                <Dialog.Title style={{ fontFamily: 'Nunito_700Bold' }}>Password</Dialog.Title>
                <Dialog.Content>
                  <TextInput
                    ref={pwInputRef}
                    label="Enter password"
                    value={pwDraft}
                    autoFocus
                    onChangeText={setPwDraft}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    textContentType="password"
                    right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
                    style={{ backgroundColor: '#FAF6F0' }}
                  />
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={() => setPwDialogVisible(false)}>Cancel</Button>
                  <Button onPress={() => { field.handleChange(pwDraft); setPwDialogVisible(false); }}>OK</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>
          </>
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
            accessibilityLabel="Sign in"
            accessibilityRole="button"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        )}
      </form.Subscribe>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: { gap: 16 },
  errorBanner: {
    backgroundColor: '#FDE8E8',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: WarmHearthColors.expiryUrgent,
  },
  errorText: { fontFamily: 'Nunito_400Regular', color: WarmHearthColors.expiryUrgent },
  submitButton: { borderRadius: 12, marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
  buttonLabel: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
