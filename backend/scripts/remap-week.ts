/**
 * One-off LOCAL remap — re-runs the ingredient mapping over THIS week's
 * already-fetched offers in Supabase without touching any retailer site,
 * so it costs ZERO ScraperAPI credits (only a few pence of AI mapping).
 *
 * Use when a weekly run fetched fine but the mapping step failed and left
 * rows with null flags (e.g. the 28 Jul 2026 OpenAI insufficient_quota
 * incident) — the app hides rows whose is_food isn't true, so an unmapped
 * week means an empty Saver strip.
 *
 * RESUMABLE: only reads rows that are still unmapped (is_food is null) and
 * saves after EVERY chunk, logging progress as it goes. Kill it at any point
 * and re-run — it picks up where it left off rather than starting over.
 *
 * Run from the backend folder:
 *   npx tsx scripts/remap-week.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load backend/.env into process.env (no dotenv dependency needed).
// Values already present in the environment win.
const envPath = resolve(process.cwd(), '.env');
let envText: string;
try {
  envText = readFileSync(envPath, 'utf8');
}
catch {
  console.error(`Could not read ${envPath} — run this from the backend folder.`);
  process.exit(1);
}
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && process.env[m[1]] === undefined)
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

/** Matches CHUNK_SIZE in map-ingredients.ts — one AI call per slice. */
const CHUNK = 40;

async function main() {
  // Imported AFTER the env is loaded, so the AI provider and Supabase
  // clients pick up the keys.
  const { createClient } = await import('@supabase/supabase-js');
  const { mapIngredients } = await import('../functions/fetch-offers/map-ingredients');
  const { isoWeekKey, saveOffers } = await import('../functions/fetch-offers/supabase-offers');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const week = isoWeekKey();
  console.log(`Week ${week} | AI provider: ${process.env.AI_PROVIDER ?? 'default'}`);

  const { data, error } = await supabase
    .from('offers')
    .select('retailer_id, product_name, brand, price_pence, was_price_pence, pack_size, offer_type, source_url')
    .eq('week_key', week)
    .is('is_food', null) // only what still needs mapping — makes re-runs resumable
    .limit(2000);
  if (error)
    throw new Error(`Supabase read failed: ${error.message}`);
  if (!data || data.length === 0) {
    console.log('Nothing left to remap — every row for this week is already mapped.');
    return;
  }

  const total = data.length;
  const chunks = Math.ceil(total / CHUNK);
  console.log(`${total} unmapped offers → ${chunks} AI calls of up to ${CHUNK}\n`);

  let food = 0;
  let cookable = 0;
  let missed = 0;

  for (let i = 0; i < total; i += CHUNK) {
    const slice = data.slice(i, i + CHUNK);
    const n = Math.floor(i / CHUNK) + 1;
    const started = Date.now();
    process.stdout.write(`  [${n}/${chunks}] mapping ${slice.length}… `);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = await mapIngredients(slice as any);
    // Save immediately, so progress survives a kill or a later failure.
    await saveOffers(mapped);

    const ok = mapped.filter(o => o.is_food !== null).length;
    food += mapped.filter(o => o.is_food === true).length;
    cookable += mapped.filter(o => o.is_ingredient === true).length;
    missed += slice.length - ok;
    console.log(`saved ${ok}/${slice.length} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }

  console.log(`\nDone: ${total} rows — ${food} food, ${cookable} cookable ingredients, ${missed} still unmapped.`);
  if (missed > 0)
    console.log('Re-run to retry the ones that failed; it skips everything already mapped.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
