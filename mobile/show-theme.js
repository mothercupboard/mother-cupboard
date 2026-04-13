/**
 * Shows the paper theme + add-item screen wrapper.
 * Run from: C:\Users\mandr\dev\mother-cupboard\mobile\
 */
const fs = require('fs');

function showFile(file) {
  if (!fs.existsSync(file)) { console.log(`\nMISSING: ${file}`); return; }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log(`\n${'='.repeat(60)}`);
  console.log(file);
  console.log('='.repeat(60));
  lines.forEach((l, i) => console.log(`${String(i+1).padStart(4)}: ${l}`));
}

showFile('src/components/common/paper-theme.ts');
showFile('src/app/inventory/add-item.tsx');
showFile('src/app/(tabs)/inventory.tsx');
