import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.remove(name),
};

type OnboardingStore = {
  ageGateAccepted: boolean;
  privacyDisclosureAccepted: boolean;
  acceptAgeGate: () => void;
  acceptPrivacyDisclosure: () => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    set => ({
      ageGateAccepted: false,
      privacyDisclosureAccepted: false,
      acceptAgeGate: () => set({ ageGateAccepted: true }),
      acceptPrivacyDisclosure: () => set({ privacyDisclosureAccepted: true }),
    }),
    {
      name: 'onboarding-store',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);
