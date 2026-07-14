import type { Session, User } from '@supabase/supabase-js';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useGuestStore } from '@/features/guest/guest-store';
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
      setSession: (session) => {
        // Cache email in MMKV so it survives session refreshes that strip the email field
        if (session?.user?.email) {
          storage.set('user-email', session.user.email);
        }
        // A real session always supersedes guest mode. Without this, a user who
        // starts as a guest, registers, confirms by email and signs in keeps
        // isGuest=true forever (register-form only clears it on the
        // no-confirmation path) and is wrongly guest-gated across the app.
        if (session && useGuestStore.getState().isGuest) {
          useGuestStore.getState().endGuestSession();
        }
        set({ session, user: session?.user ?? null });
      },
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
