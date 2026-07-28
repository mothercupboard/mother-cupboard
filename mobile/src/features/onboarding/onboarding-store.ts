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
  /** User has explicitly confirmed their region (vs. the auto-detected seed). */
  regionConfirmed: boolean;
  acceptAgeGate: () => void;
  acceptPrivacyDisclosure: () => void;
  acceptAIConsent: () => void;
  confirmRegion: () => void;

  // Post-auth progressive tips (shown once per feature, then dismissed)
  welcomeSeen: boolean;
  inventoryTipSeen: boolean;
  suggestTipSeen: boolean;
  shoppingTipSeen: boolean;
  snapTipSeen: boolean;
  /** The "what you can do" card on the home screen (see HomeGuideCard). */
  homeGuideDismissed: boolean;
  dismissWelcome: () => void;
  dismissTip: (tip: 'homeGuideDismissed' | 'inventoryTipSeen' | 'shoppingTipSeen' | 'suggestTipSeen' | 'snapTipSeen') => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    set => ({
      ageGateAccepted: false,
      privacyDisclosureAccepted: false,
      aiConsentAccepted: false,
      regionConfirmed: false,
      acceptAgeGate: () => set({ ageGateAccepted: true }),
      acceptPrivacyDisclosure: () => set({ privacyDisclosureAccepted: true }),
      acceptAIConsent: () => set({ aiConsentAccepted: true }),
      confirmRegion: () => set({ regionConfirmed: true }),

      welcomeSeen: false,
      inventoryTipSeen: false,
      suggestTipSeen: false,
      shoppingTipSeen: false,
      snapTipSeen: false,
      homeGuideDismissed: false,
      dismissWelcome: () => set({ welcomeSeen: true }),
      dismissTip: tip => set({ [tip]: true }),
    }),
    {
      name: 'onboarding-store',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);
