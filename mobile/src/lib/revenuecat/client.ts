import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';

const RC_API_KEY = 'appl_gmJqzRgAYvYSqvGayDBORwCZgHS';
const ENTITLEMENT_ID = 'Mother Cupboard Pro';

/**
 * Call once at app startup (root layout) after the user's auth
 * session has been restored.
 */
export async function configureRevenueCat(userId?: string): Promise<void> {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  Purchases.configure({ apiKey: RC_API_KEY, appUserID: userId ?? undefined });
}

/**
 * Identify the RevenueCat user after login/signup so purchase
 * history follows their Supabase user ID.
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.logIn(userId);
  return customerInfo;
}

/**
 * Clear RevenueCat identity on sign-out.
 */
export async function logOutRevenueCat(): Promise<void> {
  if (await Purchases.isAnonymous() === false) {
    await Purchases.logOut();
  }
}

/**
 * Returns true if the user has an active "premium" entitlement.
 */
export function isPremium(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/**
 * Fetch current customer info from RevenueCat.
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

/**
 * Fetch the current offerings (packages/prices).
 */
export async function getOfferings() {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

/**
 * Purchase a package and return updated customer info.
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/**
 * Restore previous purchases.
 */
export async function restorePurchasesRC(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
