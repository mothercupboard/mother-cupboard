const fs = require('fs');
const c = fs.readFileSync('src/features/inventory/components/edit-item-form.tsx', 'utf8');
console.log(c.substring(0, 3000));
