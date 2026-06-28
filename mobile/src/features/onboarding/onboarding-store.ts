import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.remove(name),
};

type OnboardingStore = {
  // Pre-auth gates
  ageGateAccepted: boolean;
  privacyDisclosureAccepted: boolean;
  aiConsentAccepted: boolean;
  acceptAgeGate: () => void;
  acceptPrivacyDisclosure: () => void;
  acceptAIConsent: () => void;

  // Post-auth progressive tips (shown once per feature, then dismissed)
  welcomeSeen: boolean;
  inventoryTipSeen: boolean;
  suggestTipSeen: boolean;
  shoppingTipSeen: boolean;
  snapTipSeen: boolean;
  dismissWelcome: () => void;
  dismissTip: (tip: 'inventoryTipSeen' | 'shoppingTipSeen' | 'suggestTipSeen' | 'snapTipSeen') => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    set => ({
      ageGateAccepted: false,
      privacyDisclosureAccepted: false,
      aiConsentAccepted: false,
      acceptAgeGate: () => set({ ageGateAccepted: true }),
      acceptPrivacyDisclosure: () => set({ privacyDisclosureAccepted: true }),
      acceptAIConsent: () => set({ aiConsentAccepted: true }),

      welcomeSeen: false,
      inventoryTipSeen: false,
      suggestTipSeen: false,
      shoppingTipSeen: false,
      snapTipSeen: false,
      dismissWelcome: () => set({ welcomeSeen: true }),
      dismissTip: tip => set({ [tip]: true }),
    }),
    {
      name: 'onboarding-store',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);




