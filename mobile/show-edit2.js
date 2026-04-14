const fs = require('fs');
const c = fs.readFileSync('src/features/inventory/components/edit-item-form.tsx', 'utf8');
const idx = c.indexOf('quantity');
console.log(c.substring(idx - 20, idx + 400));
