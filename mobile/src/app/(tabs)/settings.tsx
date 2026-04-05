import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Divider, List, Portal, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useAuthStore } from '@/features/auth/auth-store';
import { deleteAccount, signOut } from '@/features/auth/auth.service';
import { database } from '@/lib/database';

type DialogStep = 'warn' | 'confirm' | null;

type DeleteDialogsProps = {
  step: DialogStep;
  isDeleting: boolean;
  onDismiss: () => void;
  onContinue: () => void;
  onConfirm: () => void;
};

function DeleteDialogs({ step, isDeleting, onDismiss, onContinue, onConfirm }: DeleteDialogsProps) {
  return (
    <Portal>
      <Dialog visible={step === 'warn'} onDismiss={onDismiss}>
        <Dialog.Title>Delete your account?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.dialogText}>
            This will permanently delete all your inventory data from this device and from our servers within 30 days, as required by UK GDPR.
          </Text>
          <Text variant="bodyMedium" style={styles.dialogNote}>
            If you have an active subscription, please cancel it via the App Store or Play Store before proceeding. Deleting your account does not automatically cancel your subscription.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button textColor={WarmHearthColors.expiryUrgent} onPress={onContinue}>Continue</Button>
        </Dialog.Actions>
      </Dialog>

      <Dialog visible={step === 'confirm'} onDismiss={isDeleting ? () => {} : onDismiss}>
        <Dialog.Title>This cannot be undone</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.dialogText}>
            Are you absolutely sure you want to permanently delete your account and all your data?
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button disabled={isDeleting} onPress={onDismiss}>Cancel</Button>
          <Button
            textColor={WarmHearthColors.expiryUrgent}
            loading={isDeleting}
            disabled={isDeleting}
            onPress={onConfirm}
          >
            Delete my account
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export default function SettingsScreen() {
  const email = useAuthStore(s => s.session?.user.email ?? null);
  const [step, setStep] = useState<DialogStep>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteAccount();
    if (result.error) {
      setIsDeleting(false);
      setDeleteError(result.error.message);
      setStep(null);
      return;
    }
    await database.unsafeResetDatabase();
    await signOut();
    router.replace('/(auth)/register');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <List.Section>
        <List.Subheader style={styles.subheader}>Account</List.Subheader>
        <List.Item
          title="Email"
          description={email ?? '—'}
          left={props => <List.Icon {...props} icon="email-outline" />}
        />
      </List.Section>

      <Divider />

      <View style={styles.section}>
        <Button
          mode="outlined"
          onPress={handleSignOut}
          icon="logout"
          style={styles.signOutButton}
          labelStyle={styles.buttonLabel}
        >
          Sign out
        </Button>
      </View>

      <Divider />

      <View style={styles.dangerZone}>
        <Text variant="titleSmall" style={styles.dangerHeading}>Danger zone</Text>
        <Text variant="bodySmall" style={styles.dangerDesc}>
          Deleting your account is permanent and cannot be undone.
        </Text>
        {deleteError !== null && (
          <Text variant="bodySmall" style={styles.errorText}>{deleteError}</Text>
        )}
        <Button
          mode="outlined"
          onPress={() => setStep('warn')}
          icon="delete-outline"
          textColor={WarmHearthColors.expiryUrgent}
          style={styles.deleteButton}
          labelStyle={styles.buttonLabel}
        >
          Delete my account
        </Button>
      </View>

      <DeleteDialogs
        step={step}
        isDeleting={isDeleting}
        onDismiss={() => setStep(null)}
        onContinue={() => setStep('confirm')}
        onConfirm={handleDelete}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: WarmHearthColors.background,
  },
  subheader: { fontFamily: 'Nunito_600SemiBold' },
  section: {
    padding: 16,
    gap: 12,
  },
  signOutButton: { borderRadius: 12 },
  buttonLabel: { fontFamily: 'Nunito_600SemiBold' },
  dangerZone: {
    padding: 16,
    gap: 12,
  },
  dangerHeading: {
    fontFamily: 'Nunito_700Bold',
    color: WarmHearthColors.expiryUrgent,
  },
  dangerDesc: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
  },
  deleteButton: {
    borderRadius: 12,
    borderColor: WarmHearthColors.expiryUrgent,
  },
  errorText: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.expiryUrgent,
  },
  dialogText: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textPrimary,
  },
  dialogNote: {
    fontFamily: 'Nunito_400Regular',
    color: WarmHearthColors.textSecondary,
    marginTop: 12,
  },
});
