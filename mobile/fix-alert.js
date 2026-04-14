const fs = require('fs');
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');

// Remove the debug alert - it was blocking the review screen from showing
rsm = rsm.replace(
  "Alert.alert('Receipt parsed', parsed.length + ' items found: ' + parsed.map(p => p.name).join(', '));\n      const valid",
  "const valid"
);

fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
console.log('Removed debug alert');
