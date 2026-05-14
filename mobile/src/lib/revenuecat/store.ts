import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { create } from 'zustand';

import {
  getCustomerInfo,
  getOfferings,
  isPremium,
  purchasePackage,
  restorePurchasesRC,
} from './client';

type RevenueCatState = {
  /** Whether the user holds an active premium entitlement */
  hasPremium: boolean;
  /** Current offering (monthly + annual packages) */
  offering: PurchasesOffering | null;
  /** Loading flag for purchase / restore operations */
  isProcessing: boolean;
  /** Last error message */
  error: string | null;

  /** Refresh customer info and offering from RevenueCat */
  refresh: () => Promise<void>;
  /** Purchase a package and update state */
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore previous purchases */
  restore: () => Promise<boolean>;
  /** Clear error */
  clearError: () => void;
};

export const useRevenueCatStore = create<RevenueCatState>((set) => ({
  hasPremium: false,
  offering: null,
  isProcessing: false,
  error: null,

  refresh: async () => {
    try {
      const [info, offering] = await Promise.all([
        getCustomerInfo(),
        getOfferings(),
      ]);
      set({
        hasPremium: isPremium(info),
        offering: offering ?? null,
      });
    } catch (err: any) {
      console.warn('[RevenueCat] refresh failed:', err?.message);
    }
  },

  purchase: async (pkg) => {
    set({ isProcessing: true, error: null });
    try {
      const info = await purchasePackage(pkg);
      const premium = isPremium(info);
      set({ hasPremium: premium, isProcessing: false });
      return premium;
    } catch (err: any) {
      const cancelled = err?.userCancelled === true;
      set({
        isProcessing: false,
        error: cancelled ? null : (err?.message ?? 'Purchase failed. Please try again.'),
      });
      return false;
    }
  },

  restore: async () => {
    set({ isProcessing: true, error: null });
    try {
      const info = await restorePurchasesRC();
      const premium = isPremium(info);
      set({
        hasPremium: premium,
        isProcessing: false,
        error: premium ? null : 'No active subscription found.',
      });
      return premium;
    } catch (err: any) {
      set({
        isProcessing: false,
        error: err?.message ?? 'Restore failed. Please try again.',
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
