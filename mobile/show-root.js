/**
 * Shows root layout and components that could be causing a global touch blocker.
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

showFile('src/app/_layout.tsx');
showFile('src/app/(tabs)/_layout.tsx');
showFile('src/features/onboarding/components/feature-tip.tsx');
showFile('src/features/inventory/components/receipt-scanner-modal.tsx');
