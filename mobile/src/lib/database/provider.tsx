import type { Database } from '@nozbe/watermelondb';
import type { NetInfoState } from '@react-native-community/netinfo';

import NetInfo from '@react-native-community/netinfo';
import { hasUnsyncedChanges } from '@nozbe/watermelondb/sync';
import { createContext, use, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/features/auth/auth-store';
import { useInventoryStore } from '@/features/inventory/inventory-store';
import { database } from '@/lib/database';
import { syncDatabase } from '@/lib/database/sync';

const DatabaseContext = createContext<Database>(database);

// How long after a local edit before we push it. Long enough to batch a
// burst of edits (e.g. importing a receipt), short enough that another
// household member sees the change promptly.
const PUSH_DEBOUNCE_MS = 3000;

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const session = useAuthStore(s => s.session);
  const setSyncStatus = useInventoryStore(s => s.setSyncStatus);
  const setLastSyncedAt = useInventoryStore(s => s.setLastSyncedAt);
  const isSyncingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const unsubscribeNet = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected === true)
        doSync();
    });

    // Push local edits shortly after they happen — essential for household
    // sharing, where another device is waiting to see them. Debounced so a
    // burst of edits becomes one sync; the hasUnsyncedChanges guard stops
    // sync's own bookkeeping writes from re-triggering an endless loop.
    const changesSub = database.withChangesForTables(['inventory_items']).subscribe({
      next: () => {
        if (debounceRef.current)
          clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          hasUnsyncedChanges({ database }).then((pending) => {
            if (pending)
              doSync();
          }).catch(() => {});
        }, PUSH_DEBOUNCE_MS);
      },
    });

    // Pull the household's latest whenever the app returns to the foreground
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active')
        doSync();
    });

    return () => {
      unsubscribeNet();
      changesSub.unsubscribe();
      appStateSub.remove();
      if (debounceRef.current)
        clearTimeout(debounceRef.current);
    };
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
