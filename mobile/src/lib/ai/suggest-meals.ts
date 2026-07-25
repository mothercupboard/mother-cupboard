import type { RegionCode } from '@/lib/region';

import Env from 'env';

export type InventoryItemForAI = {
  name: string;
  quantity: number | null;
  unit: string | null;
  location: string;
  expiryDate: number | null;
  expiryType: string | null;
};

export type CookTrackRecord = {
  totalCooked: number;
  boldCooks: number;
  recentCooks: number;
};

/** A supermarket offer sent to the backend (Saver Cupboard). */
export type OfferForAI = {
  /** Canonical ingredient, e.g. "pork steaks". */
  ingredient: string;
  /** Retail product name, e.g. "Pork Sizzle Steaks Gochujang". */
  productName: string;
  /** Retailer display name, e.g. "Aldi". */
  retailer: string;
  pricePence: number;
  wasPricePence: number | null;
  packSize: string | null;
};

export type LocalSuggestRequest = {
  items: InventoryItemForAI[];
  adventurousness: number;
  servings: number;
  moods?: string[];
  hint?: string;
  likedMeals?: string[];
  dislikedMeals?: string[];
  cookHistory?: CookTrackRecord;
  region: RegionCode;
  /** This week's offers at the user's chosen supermarket(s), if any. */
  offers?: OfferForAI[];
};

const API_URL = Env.EXPO_PUBLIC_API_URL;

export async function suggestMealsLocal(req: LocalSuggestRequest) {
  const apiUrl = API_URL;
  const url = `${apiUrl}/suggest-meals`;

  console.log('[suggest-meals] POST', url, 'items:', req.items.length);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  }
  catch (fetchErr: any) {
    // This catches "Network request failed" — include the URL so we can debug
    throw new Error(`Fetch failed (${url}): ${fetchErr?.message ?? String(fetchErr)}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    let message = `Server error ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error?.message)
        message = errJson.error.message;
    }
    catch {}
    throw new Error(message);
  }

  const json = await response.json();
  const suggestions = json.data;
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    throw new Error('No suggestions returned');
  }
  return suggestions;
}
