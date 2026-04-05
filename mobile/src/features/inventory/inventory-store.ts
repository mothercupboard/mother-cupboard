import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'pending';

type InventoryStore = {
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (ts: number) => void;
};

export const useInventoryStore = create<InventoryStore>(set => ({
  syncStatus: 'idle',
  lastSyncedAt: null,
  setSyncStatus: status => set({ syncStatus: status }),
  setLastSyncedAt: ts => set({ lastSyncedAt: ts }),
}));
