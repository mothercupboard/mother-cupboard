import * as Notifications from 'expo-notifications';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useNotificationStore } from '@/features/notifications/notification-store';

/**
 * Returns a callback that shows the notification permission prompt
 * exactly once — after the user's first inventory item is saved.
 * Subsequent calls are no-ops.
 */
export function useNotificationPrompt() {
  const hasPrompted = useNotificationStore(s => s.hasPrompted);
  const setHasPrompted = useNotificationStore(s => s.setHasPrompted);

  return useCallback(async () => {
    if (hasPrompted)
      return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted' || existing === 'denied') {
      setHasPrompted();
      return;
    }

    // Show an in-app explanation before the OS prompt
    Alert.alert(
      'Helpful reminders',
      'We\u2019ll let you know when items are approaching their dates \u2014 and suggest meals to make with them.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => setHasPrompted() },
        {
          text: 'Enable',
          onPress: async () => {
            const { status } = await Notifications.requestPermissionsAsync();
            setHasPrompted();
            if (status === 'granted') {
              await Notifications.setNotificationChannelAsync('expiry-alerts', {
                name: 'Expiry Alerts',
                importance: Notifications.AndroidImportance.HIGH,
              });
            }
          },
        },
      ],
    );
  }, [hasPrompted, setHasPrompted]);
}
