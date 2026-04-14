const fs = require('fs');

// Fix 1: Add favourite to MoodFilter type
let types = fs.readFileSync('../shared/types/meal-suggestion.types.ts', 'utf8');
types = types.replace(
  "| 'kid-friendly';",
  "| 'kid-friendly'\n  | 'favourite';"
);
fs.writeFileSync('../shared/types/meal-suggestion.types.ts', types);
console.log('1. Added favourite to MoodFilter type');

// Fix 2: Add photoButton style to receipt scanner
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');
// Find the styles object and add photoButton before the last closing brace
rsm = rsm.replace(
  /addButton: \{([^}]+)\},?\s*\}\);/,
  'addButton: {$1},\n  photoButton: { borderColor: \'#7B5EA7\', borderRadius: 12, marginTop: 8 },\n});'
);
fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
console.log('2. Added photoButton style');
