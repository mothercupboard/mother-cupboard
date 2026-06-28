// Rough keyword check to spot when a "keen to use" item is meat or fish, so we
// can gracefully resolve the conflict with the vegetarian toggle. Intentionally
// simple — it only drives a friendly nudge and a hint tweak, not a hard rule.
const MEAT_KEYWORDS = [
  'meat', 'chicken', 'beef', 'pork', 'lamb', 'mutton', 'mince', 'steak', 'bacon',
  'sausage', 'ham', 'gammon', 'turkey', 'duck', 'goose', 'veal', 'venison',
  'chorizo', 'salami', 'pepperoni', 'prosciutto', 'pancetta', 'liver', 'kidney',
  'fish', 'salmon', 'tuna', 'cod', 'haddock', 'mackerel', 'sardine', 'anchovy',
  'trout', 'prawn', 'shrimp', 'crab', 'lobster', 'scampi', 'squid', 'mussel',
  'scallop', 'seafood',
];

export function isLikelyMeat(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return MEAT_KEYWORDS.some(k => n.includes(k));
}
