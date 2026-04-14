const fs = require('fs');

// === 1. Fix voice parser prompt for better quantity parsing ===
let vp = fs.readFileSync('src/lib/ai/voice-parser.ts', 'utf8');
vp = vp.replace(
  '- quantity: number — default 1\n- unit: string — packaging unit if mentioned (e.g. "tin", "bottle", "pack", "bag", "litre") or ""',
  '- quantity: number — extract the actual number stated. "200g" means quantity 200, "2 packs" means quantity 2, "a dozen eggs" means quantity 12. Only default to 1 when no amount at all is mentioned\n- unit: string — the unit of measurement or packaging (e.g. "g", "kg", "ml", "litre", "tin", "bottle", "pack", "bag", "items"). Extract from combined forms like "200g" → unit is "g", "500ml" → unit is "ml"'
);
// Add better examples
vp = vp.replace(
  'Example: "tin of beans that goes off August 27"\n\u2192 {"name":"Tin of Beans","quantity":1,"unit":"tin","expiryDate":"27/08/2026","expiryType":"use_by","location":"cupboard"}',
  'Examples:\n"200g of minced beef" \u2192 {"name":"Minced Beef","quantity":200,"unit":"g","expiryDate":"","expiryType":"","location":"fridge"}\n"tin of beans that goes off August 27" \u2192 {"name":"Tin of Beans","quantity":1,"unit":"tin","expiryDate":"27/08/2026","expiryType":"use_by","location":"cupboard"}\n"500ml of semi-skimmed milk" \u2192 {"name":"Semi-Skimmed Milk","quantity":500,"unit":"ml","expiryDate":"","expiryType":"","location":"fridge"}\n"2 packs of chicken breast" \u2192 {"name":"Chicken Breast","quantity":2,"unit":"pack","expiryDate":"","expiryType":"use_by","location":"fridge"}'
);
fs.writeFileSync('src/lib/ai/voice-parser.ts', vp);
console.log('1. Voice parser quantity examples improved');

// === 2. Bigger splash screen ===
let config = fs.readFileSync('app.config.ts', 'utf8');
config = config.replace('imageWidth: 150,', 'imageWidth: 800,');
fs.writeFileSync('app.config.ts', config);
console.log('2. Splash imageWidth: 150 -> 800');

// === 3. Add favourite mood option ===
let suggest = fs.readFileSync('src/app/(tabs)/suggest.tsx', 'utf8');
if (!suggest.includes("'favourite'")) {
  suggest = suggest.replace(
    "{ value: 'kid-friendly', label: 'Kid-friendly', icon: 'baby-face-outline' },",
    "{ value: 'kid-friendly', label: 'Kid-friendly', icon: 'baby-face-outline' },\n  { value: 'favourite', label: 'Favourite', icon: 'heart' },"
  );
  fs.writeFileSync('src/app/(tabs)/suggest.tsx', suggest);
  console.log('3. Added favourite mood option');
}

// Add favourite to AI prompt mood descriptions
let ai = fs.readFileSync('src/lib/ai/suggest-meals.ts', 'utf8');
if (!ai.includes('favourite')) {
  ai = ai.replace(
    "'kid-friendly': 'Kid-friendly meals the whole family will enjoy',",
    "'kid-friendly': 'Kid-friendly meals the whole family will enjoy',\n  favourite: 'Suggest meals similar to the user\\'s favourited meals — comfort picks they already love',"
  );
  fs.writeFileSync('src/lib/ai/suggest-meals.ts', ai);
  console.log('3b. Added favourite to AI mood descriptions');
}

console.log('\nPart 1 done');
