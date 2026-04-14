import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Divider, List, Portal, SegmentedButtons, Switch, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useAuthStore } from '@/features/auth/auth-store';
import { deleteAccount, restorePurchases, signOut } from '@/features/auth/auth.service';
import { useEntitlements } from '@/features/auth/entitlements';
import { useTrialStatus } from '@/features/auth/trial-store';
import { useNotificationStore } from '@/features/notifications/notification-store';
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
        <Dialog.Title>Final confirmation</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.dialogText}>
            This will permanently delete your account and all associated data. Are you sure you want to continue?
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

function useNotificationStatus() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const check = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setEnabled(status === 'granted');
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active')
        check();
    });
    return () => sub.remove();
  }, [check]);

  return enabled;
}

async function toggleNotifications(enabled: boolean | null) {
  if (enabled) {
    await Linking.openSettings();
    return;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'denied')
    await Linking.openSettings();
}

const HOUR_OPTIONS = [
  { value: '7', label: '7 AM' },
  { value: '8', label: '8 AM' },
  { value: '9', label: '9 AM' },
  { value: '10', label: '10 AM' },
];

function NotificationSection({ enabled }: { enabled: boolean | null }) {
  const useByAlerts = useNotificationStore(s => s.useByAlerts);
  const bestBeforeAlerts = useNotificationStore(s => s.bestBeforeAlerts);
  const alertHour = useNotificationStore(s => s.alertHour);
  const setUseByAlerts = useNotificationStore(s => s.setUseByAlerts);
  const setBestBeforeAlerts = useNotificationStore(s => s.setBestBeforeAlerts);
  const setAlertHour = useNotificationStore(s => s.setAlertHour);

  const permissionGranted = enabled === true;

  return (
    <List.Section>
      <List.Subheader style={settingsStyles.subheader}>Notifications</List.Subheader>

      <List.Item
        title="Device permissions"
        description={permissionGranted ? 'Granted' : 'Tap to enable in device settings'}
        left={props => <List.Icon {...props} icon="bell-outline" />}
        right={() => (
          <Switch
            value={permissionGranted}
            onValueChange={() => toggleNotifications(enabled)}
            color={WarmHearthColors.primary}
          />
        )}
        onPress={() => toggleNotifications(enabled)}
      />

      <List.Item
        title="Use-by alerts"
        description="Items with use-by dates coming up soon"
        left={props => <List.Icon {...props} icon="alert-circle-outline" />}
        right={() => (
          <Switch
            value={useByAlerts}
            disabled={!permissionGranted}
            onValueChange={setUseByAlerts}
            color={WarmHearthColors.expiryUrgent}
          />
        )}
        onPress={() => permissionGranted && setUseByAlerts(!useByAlerts)}
        disabled={!permissionGranted}
      />

      <List.Item
        title="Best-before alerts"
        description="Items approaching their best-before date"
        left={props => <List.Icon {...props} icon="clock-alert-outline" />}
        right={() => (
          <Switch
            value={bestBeforeAlerts}
            disabled={!permissionGranted}
            onValueChange={setBestBeforeAlerts}
            color={WarmHearthColors.expiryWarning}
          />
        )}
        onPress={() => permissionGranted && setBestBeforeAlerts(!bestBeforeAlerts)}
        disabled={!permissionGranted}
      />

      <List.Item
        title="Alert time"
        description="When scheduled alerts arrive"
        left={props => <List.Icon {...props} icon="clock-outline" />}
        disabled={!permissionGranted}
      />
      <View style={settingsStyles.segmentedRow}>
        <SegmentedButtons
          value={String(alertHour)}
          onValueChange={v => setAlertHour(Number(v))}
          buttons={HOUR_OPTIONS}
          density="small"
          style={settingsStyles.segmentedButtons}
        />
      </View>
    </List.Section>
  );
}

const settingsStyles = StyleSheet.create({
  subheader: { fontFamily: 'Nunito_600SemiBold' },
  segmentedRow: {
    paddingHorizontal: 56,
    paddingBottom: 8,
  },
  segmentedButtons: {
    maxWidth: 280,
  },
});

function PlanSection() {
  const trial = useTrialStatus();
  const { plan } = useEntitlements();
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  async function handleRestore() {
    setIsRestoring(true);
    setRestoreMessage(null);
    const result = await restorePurchases();
    setIsRestoring(false);
    setRestoreMessage(result.error ? result.error.message : 'Purchase restored successfully!');
  }

  const planDescription
    = plan === 'premium'
      ? 'Premium'
      : trial.state === 'active'
        ? `Free trial \u2014 ${trial.daysRemaining} days remaining`
        : trial.state === 'expiring'
          ? `Trial ending \u2014 ${trial.daysRemaining} days left`
          : 'Free';

  return (
    <>
      <List.Item
        title="Plan"
        description={planDescription}
        left={props => <List.Icon {...props} icon="shield-star-outline" />}
      />
      {plan !== 'premium' && (
        <View style={planStyles.actions}>
          <Button mode="contained" icon="rocket-launch-outline" style={planStyles.upgradeButton} labelStyle={planStyles.upgradeLabel}>
            Upgrade to Premium
          </Button>
          <Button mode="text" icon="restore" loading={isRestoring} disabled={isRestoring} onPress={handleRestore} labelStyle={planStyles.restoreLabel} compact>
            Restore purchases
          </Button>
          {restoreMessage && (
            <Text variant="bodySmall" style={planStyles.message}>{restoreMessage}</Text>
          )}
        </View>
      )}
    </>
  );
}

const planStyles = StyleSheet.create({
  actions: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  upgradeButton: { borderRadius: 12 },
  upgradeLabel: { fontFamily: 'Nunito_700Bold' },
  restoreLabel: { color: WarmHearthColors.textSecondary, fontFamily: 'Nunito_400Regular', fontSize: 13 },
  message: { color: WarmHearthColors.textSecondary, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
});

export default function SettingsScreen() {
  const email = useAuthStore(s => s.user?.email ?? s.session?.user?.email ?? null);
  const notificationsEnabled = useNotificationStatus();
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
        <PlanSection />
      </List.Section>

      <Divider />

      <NotificationSection enabled={notificationsEnabled} />

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
  restoreLabel: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
  },
  restoreMessage: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
  },
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
