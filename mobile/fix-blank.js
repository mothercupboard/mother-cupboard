const fs = require('fs');

// === Fix 1: Filter out blank items from inventory display ===
let inv = fs.readFileSync('src/features/inventory/use-inventory-items.ts', 'utf8');
// Add filter for non-empty names
inv = inv.replace(
  "const conditions = [Q.where('is_deleted', false)];",
  "const conditions = [Q.where('is_deleted', false), Q.where('name', Q.notEq(''))];"
);
fs.writeFileSync('src/features/inventory/use-inventory-items.ts', inv);
console.log('1. Inventory list filters out blank-name items');

// === Fix 2: Prevent blank items in shopping list -> cupboard migration ===
let shop = fs.readFileSync('src/app/(tabs)/shopping-list.tsx', 'utf8');
shop = shop.replace(
  'async function moveToInventory(checkedItems: { name: string; quantity: string }[]) {',
  'async function moveToInventory(checkedItems: { name: string; quantity: string }[]) {\n    const validItems = checkedItems.filter(i => i.name.trim().length > 0);\n    if (validItems.length === 0) return;'
);
shop = shop.replace(
  '      for (const item of checkedItems) {',
  '      for (const item of validItems) {'
);
fs.writeFileSync('src/app/(tabs)/shopping-list.tsx', shop);
console.log('2. Shopping list migration skips blank items');

// === Fix 3: Prevent blank items in receipt scanner ===
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');
// Filter parsed items to remove blanks before setting state
if (!rsm.includes('filter(p => p.name')) {
  rsm = rsm.replace(
    "setItems(parsed.map((p, i) => ({ ...p, id: String(i) })));",
    "const valid = parsed.filter(p => p.name && p.name.trim().length > 0);\n      setItems(valid.map((p, i) => ({ ...p, id: String(i) })));"
  );
  // Do it for both handleTakePhoto and handleChoosePhoto if they exist
  rsm = rsm.replace(
    /setItems\(parsed\.map\(\(p, i\) => \(\{ \.\.\.p, id: String\(i\) \}\)\)\);/g,
    "const validItems = parsed.filter(p => p.name && p.name.trim().length > 0);\n      setItems(validItems.map((p, i) => ({ ...p, id: String(i) })));"
  );
  fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
  console.log('3. Receipt scanner filters blank items');
}

console.log('\nDone');
