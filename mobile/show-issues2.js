const fs = require('fs');

// Check off-database (where search results come from)
console.log('=== off-database.ts ===');
const offDb = fs.readFileSync('src/lib/barcode/off-database.ts', 'utf8');
console.log(offDb.substring(0, 1500));

// Check the dialog JSX in add-item-form
const af = fs.readFileSync('src/features/inventory/components/add-item-form.tsx', 'utf8');
const pressableIdx = af.indexOf('Pressable onPress');
console.log('\n=== Quantity Pressable + Dialog ===');
console.log(af.substring(pressableIdx, pressableIdx + 800));
