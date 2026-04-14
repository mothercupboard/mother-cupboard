const fs = require('fs');

// === Fix 1: Quantity dialog - remove autoFocus, add pointerEvents ===
let af = fs.readFileSync('src/features/inventory/components/add-item-form.tsx', 'utf8');

// Wrap the display PaperTextInput in pointerEvents="none" View
af = af.replace(
  '<Pressable onPress={() => { setQtyDraft(quantity); setQtyDialogVisible(true); }}>\n        <PaperTextInput',
  '<Pressable onPress={() => { setQtyDraft(quantity); setQtyDialogVisible(true); }}>\n        <View pointerEvents="none">\n        <PaperTextInput'
);
af = af.replace(
  /(\s*\/>)\n      <\/Pressable>\n      <Portal>/,
  '$1\n        </View>\n      </Pressable>\n      <Portal>'
);

// Remove autoFocus from dialog TextInput
af = af.replace(/              autoFocus\n/, '');

// Add View import if needed
if (!af.includes("View,") && !af.includes("View }")) {
  af = af.replace(
    "import { Pressable, ScrollView, StyleSheet } from 'react-native';",
    "import { Pressable, ScrollView, StyleSheet, View } from 'react-native';"
  );
}

fs.writeFileSync('src/features/inventory/components/add-item-form.tsx', af);
console.log('1a. Fixed add-item-form quantity dialog');

// Same for edit form
let ef = fs.readFileSync('src/features/inventory/components/edit-item-form.tsx', 'utf8');
ef = ef.replace(
  '<Pressable onPress={() => { setQtyDraft(quantity); setQtyDialogVisible(true); }}>\n        <PaperTextInput',
  '<Pressable onPress={() => { setQtyDraft(quantity); setQtyDialogVisible(true); }}>\n        <View pointerEvents="none">\n        <PaperTextInput'
);
ef = ef.replace(
  /(\s*\/>)\n      <\/Pressable>\n      <Portal>/,
  '$1\n        </View>\n      </Pressable>\n      <Portal>'
);
ef = ef.replace(/              autoFocus\n/, '');
fs.writeFileSync('src/features/inventory/components/edit-item-form.tsx', ef);
console.log('1b. Fixed edit-item-form quantity dialog');

// === Fix 2: Search by name - add online OFF API search ===
let offDb = fs.readFileSync('src/lib/barcode/off-database.ts', 'utf8');
if (!offDb.includes('searchOnline')) {
  // Find the end of the file and add an online search function
  const searchFunc = offDb.indexOf('export async function searchByName');
  const searchEnd = offDb.indexOf('\n}', searchFunc) + 2;
  const existingSearch = offDb.substring(searchFunc, searchEnd);
  
  // Replace searchByName to include online fallback
  const newSearch = `export async function searchByName(query: string): Promise<OffProduct[]> {
  const db = await openDb();
  const q = \`%\${query}%\`;
  // 1. Check local cache
  const cached = await db.getAllAsync<OffProduct>(
    'SELECT barcode, name, category FROM off_cache WHERE name LIKE ? LIMIT 20',
    [q],
  );
  if (cached.length >= 3) return cached;
  // 2. Fallback: search Open Food Facts API
  try {
    const res = await fetch(
      \`https://world.openfoodfacts.org/cgi/search.pl?search_terms=\${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,categories_tags\`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return cached;
    const data = await res.json();
    const products: OffProduct[] = (data.products ?? [])
      .filter((p: any) => p.product_name && p.code)
      .map((p: any) => ({
        barcode: p.code,
        name: p.product_name,
        category: p.categories_tags?.[0]?.replace('en:', '') ?? null,
      }));
    if (products.length > 0) await cacheProducts(db, products);
    // Merge cached + online, deduplicate by barcode
    const merged = new Map<string, OffProduct>();
    for (const p of [...cached, ...products]) merged.set(p.barcode, p);
    return [...merged.values()].slice(0, 20);
  } catch {
    return cached;
  }
}`;

  offDb = offDb.substring(0, searchFunc) + newSearch + offDb.substring(searchEnd);
  fs.writeFileSync('src/lib/barcode/off-database.ts', offDb);
  console.log('2. Search by name now queries Open Food Facts API');
}

console.log('\nDone. Run: npx tsc --noEmit');
