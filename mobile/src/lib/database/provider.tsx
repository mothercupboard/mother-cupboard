import type { Database } from '@nozbe/watermelondb';
import type { NetInfoState } from '@react-native-community/netinfo';

import NetInfo from '@react-native-community/netinfo';
import { createContext, use, useEffect, useRef } from 'react';

import { useAuthStore } from '@/features/auth/auth-store';
import { useInventoryStore } from '@/features/inventory/inventory-store';
import { database } from '@/lib/database';
import { syncDatabase } from '@/lib/database/sync';

const DatabaseContext = createContext<Database>(database);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const session = useAuthStore(s => s.session);
  const setSyncStatus = useInventoryStore(s => s.setSyncStatus);
  const setLastSyncedAt = useInventoryStore(s => s.setLastSyncedAt);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!session)
      return;

    async function doSync() {
      if (isSyncingRef.current)
        return;
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      try {
        await syncDatabase(database);
        setSyncStatus('synced');
        setLastSyncedAt(Date.now());
      }
      catch {
        setSyncStatus('error');
      }
      finally {
        isSyncingRef.current = false;
      }
    }

    // Sync immediately on mount / sign-in
    doSync();

    // Re-sync whenever connectivity is restored
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected === true)
        doSync();
    });

    return unsubscribe;
  }, [session, setSyncStatus, setLastSyncedAt]);

  return (
    <DatabaseContext value={database}>
      {children}
    </DatabaseContext>
  );
}

export function useDatabase(): Database {
  return use(DatabaseContext);
}
