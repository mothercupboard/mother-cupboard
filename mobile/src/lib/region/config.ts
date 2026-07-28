import { getLocales } from 'expo-localization';

/**
 * Supported storefront regions for Mother Cupboard.
 *
 * Region is distinct from language: all four regions use English, but they
 * differ in currency, date/number formatting and — for Workstream B — which
 * Open Food Facts country set to prefer when scanning barcodes.
 *
 * Adding a region here is the single place that new markets are declared.
 */
export type RegionCode = 'GB' | 'IE' | 'AU' | 'NZ';

export type RegionConfig = {
  code: RegionCode;
  /** Human-readable name shown in Settings. */
  label: string;
  /** BCP-47 locale tag used for date/number/currency formatting. */
  locale: string;
  /** ISO 4217 currency code (display only — actual prices come from the store). */
  currency: string;
  /** Open Food Facts country slug used to prefer local products (Workstream B). */
  offCountry: string;
  /**
   * Open Food Facts country subdomain (e.g. uk.openfoodfacts.org) queried
   * FIRST for barcode lookups so region-specific product entries win; the
   * worldwide endpoint is the fallback. Note GB's subdomain is 'uk', not 'gb'.
   */
  offSubdomain: string;
};

export const REGIONS: Record<RegionCode, RegionConfig> = {
  GB: { code: 'GB', label: 'United Kingdom', locale: 'en-GB', currency: 'GBP', offCountry: 'united-kingdom', offSubdomain: 'uk' },
  IE: { code: 'IE', label: 'Ireland', locale: 'en-IE', currency: 'EUR', offCountry: 'ireland', offSubdomain: 'ie' },
  AU: { code: 'AU', label: 'Australia', locale: 'en-AU', currency: 'AUD', offCountry: 'australia', offSubdomain: 'au' },
  NZ: { code: 'NZ', label: 'New Zealand', locale: 'en-NZ', currency: 'NZD', offCountry: 'new-zealand', offSubdomain: 'nz' },
};

/** Ordered list for rendering the picker. */
export const SUPPORTED_REGIONS: readonly RegionConfig[] = [
  REGIONS.GB,
  REGIONS.IE,
  REGIONS.AU,
  REGIONS.NZ,
];

export const DEFAULT_REGION: RegionCode = 'GB';

/** Reads the device region and returns it if supported, else the default. */
export function detectDeviceRegion(): RegionCode {
  const code = getLocales()[0]?.regionCode;
  if (code && code in REGIONS)
    return code as RegionCode;
  return DEFAULT_REGION;
}

/**
 * Whether the device unambiguously reports one of our four markets. When true
 * we trust the auto-detected region and skip the onboarding region step; when
 * false (the phone reports the US, somewhere unsupported, or nothing) we fell
 * back to DEFAULT_REGION as a guess, so we ask the user to confirm.
 */
export function isDeviceRegionConfident(): boolean {
  const code = getLocales()[0]?.regionCode;
  return !!code && code in REGIONS;
}
