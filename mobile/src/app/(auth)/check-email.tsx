import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { supabase } from '@/lib/supabase/client';

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [resendState, setResendState] = useState<'error' | 'idle' | 'sending' | 'sent'>('idle');

  async function handleResend() {
    if (!email)
      return;
    setResendState('sending');
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResendState(error ? 'error' : 'sent');
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.iconBadge}>
        <MaterialCommunityIcons name="email-check-outline" size={40} color={WarmHearthColors.primary} />
      </View>

      <Text variant="headlineMedium" style={styles.heading}>Confirm your email</Text>

      <Text variant="bodyMedium" style={styles.subtext}>
        We&rsquo;ve sent a confirmation link to
        {' '}
        <Text style={styles.email}>{email ?? 'your email address'}</Text>
        . Tap it to activate your account, then come back and sign in.
      </Text>

      <Text variant="bodySmall" style={styles.hint}>
        Can&rsquo;t see it? Have a look in your spam or junk folder.
      </Text>

      <Button
        mode="contained"
        onPress={() => router.replace('/(auth)/login')}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
        accessibilityLabel="Back to sign in"
      >
        Back to sign in
      </Button>

      {resendState === 'sent'
        ? <Text variant="bodySmall" style={styles.resent}>Confirmation email sent again.</Text>
        : (
            <Text
              variant="bodySmall"
              style={styles.resendLink}
              onPress={resendState === 'sending' ? undefined : handleResend}
              accessibilityRole="button"
              accessibilityLabel="Resend confirmation email"
            >
              {resendState === 'sending' ? 'Sending…' : 'Resend confirmation email'}
            </Text>
          )}

      {resendState === 'error' && (
        <Text variant="bodySmall" style={styles.error}>
          Couldn&rsquo;t resend just now — try again in a moment.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: WarmHearthColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 14,
  },
  iconBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FBECE3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heading: {
    fontFamily: 'Nunito_700Bold',
    color: WarmHearthColors.textPrimary,
    textAlign: 'center',
  },
  subtext: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  email: {
    fontFamily: 'Nunito_700Bold',
    color: WarmHearthColors.textPrimary,
  },
  hint: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.outline,
    textAlign: 'center',
  },
  button: {
    borderRadius: 12,
    marginTop: 12,
    alignSelf: 'stretch',
  },
  buttonContent: { paddingVertical: 6 },
  buttonLabel: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  resendLink: {
    fontFamily: 'Nunito_600SemiBold',
    color: WarmHearthColors.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  resent: {
    fontFamily: 'Nunito_600SemiBold',
    color: WarmHearthColors.success,
    textAlign: 'center',
    marginTop: 4,
  },
  error: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.expiryUrgent,
    textAlign: 'center',
  },
});
