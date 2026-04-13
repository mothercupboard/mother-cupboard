/**
 * Shows the current state of the search screen and add-item-form TextInput areas.
 * Run from: C:\Users\mandr\dev\mother-cupboard\mobile\
 */
const fs = require('fs');

function showLines(file, label) {
  if (!fs.existsSync(file)) { console.log(`MISSING: ${file}`); return; }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label} — ${file}`);
  console.log('='.repeat(60));
  lines.forEach((l, i) => console.log(`${String(i+1).padStart(4)}: ${l}`));
}

showLines('src/app/inventory/search.tsx', 'SEARCH SCREEN');
showLines('src/features/inventory/components/add-item-form.tsx', 'ADD ITEM FORM (first 120 lines)');
showLines('src/features/shopping-list/components/add-item-input.tsx', 'SHOPPING LIST INPUT');
