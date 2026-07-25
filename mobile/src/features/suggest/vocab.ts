/**
 * Canonicalises regional ingredient synonyms to a single shared term so that
 * deduction matching works regardless of which English variety named the item.
 *
 * When recipes come back with Australian/NZ terms (e.g. "capsicum", "zucchini")
 * they must still match UK-named inventory ("pepper", "courgette"). Mapping both
 * sides to one canonical token before comparing achieves that. The map is
 * region-independent: a synonym means the same thing whatever the user's region,
 * so it is always safe to apply.
 *
 * Only the ingredient-matching path uses this — it never changes what the user
 * sees, only how names are compared.
 */
const SYNONYM_PAIRS: readonly (readonly [RegExp, string])[] = [
  [/\bbell peppers?\b/g, 'pepper'],
  [/\bcapsicums?\b/g, 'pepper'],
  [/\bzucchinis?\b/g, 'courgette'],
  [/\beggplants?\b/g, 'aubergine'],
  [/\bcilantro\b/g, 'coriander'],
  [/\barugula\b/g, 'rocket'],
  [/\bshrimps?\b/g, 'prawn'],
  [/\bprawns\b/g, 'prawn'],
  [/\bscallions?\b/g, 'spring onion'],
  [/\bgreen onions?\b/g, 'spring onion'],
  [/\bgarbanzos?\b/g, 'chickpea'],
  [/\bk[uū]maras?\b/g, 'sweet potato'],
  [/\bmangetout\b/g, 'snow pea'],
  [/\bsnow peas\b/g, 'snow pea'],
  [/\brutabagas?\b/g, 'swede'],
];

/** Lowercases a name and normalises known regional synonyms to a canonical term. */
export function canonicalizeName(name: string): string {
  let out = name.toLowerCase();
  for (const [re, replacement] of SYNONYM_PAIRS)
    out = out.replace(re, replacement);
  return out.trim();
}
