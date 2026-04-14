const fs = require('fs');

// === Fix 1: Receipt scanner - handle app screenshots + empty results ===
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');

// Add "No items found" handling to handleChoosePhoto
rsm = rsm.replace(
  "const valid = parsed.filter(p => p.name && p.name.trim().length > 0);\n      setItems(valid.map((p, i) => ({ ...p, id: String(i) })));\n      setState('review');",
  "const valid = parsed.filter(p => p.name && p.name.trim().length > 0);\n      if (valid.length === 0) {\n        Alert.alert('No items found', 'Could not find any food items. Try a clearer image of your receipt.');\n        setState('idle');\n        return;\n      }\n      setItems(valid.map((p, i) => ({ ...p, id: String(i) })));\n      setState('review');"
);

fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
console.log('1. Receipt scanner: added empty results handling');

// === Fix 2: Update receipt AI prompt to handle digital/app receipts ===
let vp = fs.readFileSync('src/lib/ai/voice-parser.ts', 'utf8');
vp = vp.replace(
  'You are a UK grocery receipt parser. Extract only food and drink items from this receipt.',
  'You are a UK grocery receipt and shopping list parser. Extract food and drink items from this image. The image may be a paper receipt, a screenshot from a store loyalty app (such as Smartpay, Tesco Clubcard, Sainsbury\'s Nectar, etc.), a digital receipt, or a photo of a shopping list. Look for product names, quantities, and prices.'
);

fs.writeFileSync('src/lib/ai/voice-parser.ts', vp);
console.log('2. Receipt AI prompt updated for digital receipts');

// === Fix 3: Check search function exists properly ===
const offDb = fs.readFileSync('src/lib/barcode/off-database.ts', 'utf8');
console.log('3. searchByName has API fallback:', offDb.includes('openfoodfacts.org/cgi/search'));
console.log('   searchByName function exists:', offDb.includes('export async function searchByName'));

// Verify the search screen calls searchByName
const search = fs.readFileSync('src/app/inventory/search.tsx', 'utf8');
console.log('   search screen imports searchByName:', search.includes('searchByName'));
console.log('   search screen calls it:', search.includes('await searchByName'));

console.log('\nDone');
