const fs = require('fs');
let inv = fs.readFileSync('src/app/(tabs)/inventory.tsx', 'utf8');
inv = inv.replace(
  "router.push('/inventory/scan-receipt')",
  "router.push('/inventory/scan-receipt' as any)"
);
fs.writeFileSync('src/app/(tabs)/inventory.tsx', inv);
console.log('Done');
