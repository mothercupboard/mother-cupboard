import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/**
 * Returns `true` when the device has an active network connection,
 * `false` when offline, and `null` while the initial check is pending.
 */
export function useNetworkStatus(): boolean | null {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    return unsubscribe;
  }, []);

  return isConnected;
}
