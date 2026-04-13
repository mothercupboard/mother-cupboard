/**
 * Shows FormTextField and the shopping list screen (to find any input blockers).
 * Run from: C:\Users\mandr\dev\mother-cupboard\mobile\
 */
const fs = require('fs');

function showFile(file) {
  if (!fs.existsSync(file)) { console.log(`MISSING: ${file}`); return; }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log(`\n${'='.repeat(60)}`);
  console.log(file);
  console.log('='.repeat(60));
  lines.forEach((l, i) => console.log(`${String(i+1).padStart(4)}: ${l}`));
}

showFile('src/components/common/form-text-field.tsx');
showFile('src/app/(tabs)/shopping-list.tsx');
