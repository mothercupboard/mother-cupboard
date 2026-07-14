import type { HouseholdInfo } from '@/features/household/household.service';

import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Share, StyleSheet } from 'react-native';
import { Button, Dialog, List, Portal, Text, TextInput } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { useAuthStore } from '@/features/auth/auth-store';
import { useEntitlements } from '@/features/auth/entitlements';
import { useGuestStore } from '@/features/guest/guest-store';
import {
  createHouseholdInvite,
  fetchHouseholdInfo,
  joinHousehold,
  leaveHousehold,
} from '@/features/household/household.service';
import { database } from '@/lib/database';
import { clearHouseholdCache, syncDatabase } from '@/lib/database/sync';

type DialogKind = 'invite' | 'join' | 'leave' | null;

/**
 * Settings section for household sharing: see who shares your cupboard,
 * invite someone (premium), join with a code (free), or leave.
 */
export function HouseholdSection() {
  const isGuest = useGuestStore(s => s.isGuest);
  const currentUserId = useAuthStore(s => s.user?.id);
  const { canUseHouseholdSharing } = useEntitlements();

  const [info, setInfo] = useState<HouseholdInfo | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isGuest)
      return;
    const result = await fetchHouseholdInfo();
    if (result.data)
      setInfo(result.data);
  }, [isGuest]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const members = info?.members ?? [];
  const isShared = members.length > 1;

  function closeDialog() {
    if (isBusy)
      return;
    setDialog(null);
    setInviteCode(null);
    setJoinInput('');
    setError(null);
  }

  async function handleInvitePress() {
    if (!canUseHouseholdSharing) {
      router.push('/paywall');
      return;
    }
    setError(null);
    setDialog('invite');
    setIsBusy(true);
    const result = await createHouseholdInvite();
    setIsBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setInviteCode(result.data);
  }

  async function handleShareCode() {
    if (!inviteCode)
      return;
    await Share.share({
      message: `Join my Mother Cupboard household so we share one cupboard! Open the app, go to Settings → Household → Join a household, and enter the code ${inviteCode} (valid for 48 hours).`,
    });
  }

  /** Wipe the local database and pull the (new) household's items fresh. */
  async function resetAndResync() {
    clearHouseholdCache();
    // unsafeResetDatabase must run inside a writer block or WatermelonDB throws
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    await syncDatabase(database);
  }

  async function handleJoin() {
    const code = joinInput.trim().toUpperCase();
    if (code.length !== 6) {
      setError('Codes are 6 characters long.');
      return;
    }
    setIsBusy(true);
    setError(null);
    const result = await joinHousehold(code);
    if (result.error) {
      setIsBusy(false);
      setError(result.error);
      return;
    }
    try {
      await resetAndResync();
    }
    catch {
      // The join itself succeeded — only the local refresh failed. A restart
      // (or the next sync) completes the switch, so tell the user rather
      // than leaving a silent half-state.
      setIsBusy(false);
      setError('Joined! But refreshing your cupboard failed — please close and reopen the app.');
      return;
    }
    setIsBusy(false);
    setDialog(null);
    setJoinInput('');
    await refresh();
  }

  async function handleLeave() {
    setIsBusy(true);
    setError(null);
    const result = await leaveHousehold();
    if (result.error) {
      setIsBusy(false);
      setError(result.error);
      return;
    }
    try {
      await resetAndResync();
    }
    catch {
      setIsBusy(false);
      setError('Left the household, but refreshing failed — please close and reopen the app.');
      return;
    }
    setIsBusy(false);
    setDialog(null);
    await refresh();
  }

  if (isGuest) {
    return (
      <List.Section>
        <List.Subheader style={styles.subheader}>Household</List.Subheader>
        <List.Item
          title="Share your cupboard"
          description="Create a free account to share one cupboard with your household"
          left={props => <List.Icon {...props} icon="account-group-outline" />}
          onPress={() => router.push('/(auth)/register')}
        />
      </List.Section>
    );
  }

  return (
    <List.Section>
      <List.Subheader style={styles.subheader}>Household</List.Subheader>

      {isShared && members.map(member => (
        <List.Item
          key={member.user_id}
          title={member.email}
          description={member.user_id === currentUserId
            ? (member.role === 'owner' ? 'Owner — you' : 'You')
            : (member.role === 'owner' ? 'Owner' : 'Member')}
          left={props => (
            <List.Icon
              {...props}
              icon={member.role === 'owner' ? 'crown-outline' : 'account-outline'}
            />
          )}
        />
      ))}

      <List.Item
        title="Invite someone"
        description={isShared
          ? 'Add another person to your shared cupboard'
          : 'Share one cupboard with the people in your house'}
        left={props => <List.Icon {...props} icon="account-plus-outline" />}
        right={props => (canUseHouseholdSharing
          ? <List.Icon {...props} icon="chevron-right" />
          : <List.Icon {...props} icon="crown-outline" color={WarmHearthColors.primary} />)}
        onPress={handleInvitePress}
      />

      <List.Item
        title="Join a household"
        description="Enter an invite code someone shared with you"
        left={props => <List.Icon {...props} icon="home-import-outline" />}
        right={props => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => {
          setError(null);
          setDialog('join');
        }}
      />

      {isShared && (
        <List.Item
          title="Leave household"
          description="The shared cupboard stays with the others"
          left={props => <List.Icon {...props} icon="home-export-outline" color={WarmHearthColors.expiryUrgent} />}
          onPress={() => {
            setError(null);
            setDialog('leave');
          }}
        />
      )}

      <Portal>
        <Dialog visible={dialog === 'invite'} onDismiss={closeDialog}>
          <Dialog.Title>Invite to your household</Dialog.Title>
          <Dialog.Content>
            {inviteCode
              ? (
                  <>
                    <Text variant="bodyMedium" style={styles.dialogText}>
                      Give this code to the person joining. It works once and expires in 48 hours.
                    </Text>
                    <Text variant="headlineMedium" style={styles.code}>{inviteCode}</Text>
                    <Text variant="bodySmall" style={styles.dialogNote}>
                      They enter it under Settings → Household → Join a household. Any food they've already added comes with them into the shared cupboard.
                    </Text>
                  </>
                )
              : (
                  <Text variant="bodyMedium" style={styles.dialogText}>
                    {error ?? 'Creating your invite code...'}
                  </Text>
                )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Done</Button>
            {inviteCode
              ? <Button icon="share-variant" onPress={handleShareCode}>Share code</Button>
              : null}
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={dialog === 'join'} onDismiss={closeDialog}>
          <Dialog.Title>Join a household</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Enter the 6-character code you were given. Your existing items will be merged into the shared cupboard.
            </Text>
            <TextInput
              mode="outlined"
              value={joinInput}
              onChangeText={text => setJoinInput(text.toUpperCase())}
              placeholder="e.g. K7PMQ2"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              style={styles.codeInput}
            />
            {error !== null && (
              <Text variant="bodySmall" style={styles.errorText}>{error}</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={isBusy} onPress={closeDialog}>Cancel</Button>
            <Button
              mode="contained"
              loading={isBusy}
              disabled={isBusy || joinInput.trim().length !== 6}
              onPress={handleJoin}
            >
              Join
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={dialog === 'leave'} onDismiss={closeDialog}>
          <Dialog.Title>Leave this household?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              The shared cupboard stays with the remaining members. You'll start again with an empty cupboard of your own.
            </Text>
            {error !== null && (
              <Text variant="bodySmall" style={styles.errorText}>{error}</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={isBusy} onPress={closeDialog}>Cancel</Button>
            <Button
              textColor={WarmHearthColors.expiryUrgent}
              loading={isBusy}
              disabled={isBusy}
              onPress={handleLeave}
            >
              Leave household
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </List.Section>
  );
}

const styles = StyleSheet.create({
  subheader: { fontFamily: 'Nunito_600SemiBold' },
  dialogText: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
  },
  dialogNote: {
    color: WarmHearthColors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    marginTop: 12,
  },
  code: {
    color: WarmHearthColors.primary,
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 6,
    marginVertical: 16,
    textAlign: 'center',
  },
  codeInput: {
    marginTop: 16,
  },
  errorText: {
    color: WarmHearthColors.expiryUrgent,
    fontFamily: 'Nunito_400Regular',
    marginTop: 8,
  },
});
