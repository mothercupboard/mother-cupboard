const fs = require('fs');
const c = fs.readFileSync('src/features/inventory/components/edit-item-form.tsx', 'utf8');
const idx = c.indexOf('Quantity');
if (idx === -1) { console.log('NOT FOUND'); process.exit(1); }
console.log(c.substring(idx - 50, idx + 400));
const retIdx = c.lastIndexOf('return (');
console.log(c.substring(retIdx, retIdx + 1500));
