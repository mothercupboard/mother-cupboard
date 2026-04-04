import type { Session, User } from '@supabase/supabase-js';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.remove(name),
};

type AuthStore = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    set => ({
      user: null,
      session: null,
      isLoading: false,
      setSession: session =>
        set({ session, user: session?.user ?? null }),
      setLoading: isLoading => set({ isLoading }),
      clearSession: () => set({ user: null, session: null }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => mmkvZustandStorage),
      partialize: state => ({ user: state.user, session: state.session }),
    },
  ),
);
