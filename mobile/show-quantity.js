const fs = require('fs');
const c = fs.readFileSync('src/features/inventory/components/add-item-form.tsx', 'utf8');
const idx = c.indexOf('label="Quantity');
if (idx === -1) { console.log('NOT FOUND'); process.exit(1); }
console.log(c.substring(idx - 10, idx + 300));
