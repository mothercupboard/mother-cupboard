/**
 * Shared types for the Saver Cupboard offers pipeline.
 */

export type RetailerId =
  | 'aldi'
  | 'aldi_ie'
  | 'lidl'
  | 'tesco'
  | 'tesco_ie'
  | 'sainsburys'
  | 'morrisons'
  | 'asda'
  | 'supervalu'
  | 'woolworths_nz'
  | 'paknsave'
  | 'woolworths_au';

export type OfferType = 'weekly_offer' | 'price_drop' | 'multibuy' | 'loyalty';

export type IngredientCategory =
  | 'meat'
  | 'fish'
  | 'fruit'
  | 'veg'
  | 'dairy'
  | 'bakery'
  | 'pantry'
  | 'frozen'
  | 'drinks'
  | 'ready';

/** A raw offer as fetched from a retailer, before ingredient mapping. */
export interface RawOffer {
  retailer_id: RetailerId;
  product_name: string;
  brand: string | null;
  price_pence: number;
  was_price_pence: number | null;
  pack_size: string | null;
  offer_type: OfferType;
  source_url: string | null;
}

/** An offer after the ingredient-mapping pass. */
export interface MappedOffer extends RawOffer {
  /** null = the mapping pass missed this item; review manually. */
  is_food: boolean | null;
  /**
   * Would this plausibly appear on a home recipe's ingredient list?
   * Distinguishes cooking ingredients (chicken, peppers, pasta, tinned
   * tomatoes) from snacks/drinks that are food but never cooked with
   * (crisps, biscuits, tea bags, chocolate bars). The app surfaces
   * ingredients first. null = mapping missed it.
   */
  is_ingredient: boolean | null;
  canonical_ingredient: string | null;
  ingredient_category: IngredientCategory | null;
}
