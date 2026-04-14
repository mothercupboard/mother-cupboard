const fs = require('fs');

// Check how quantity dialog is set up
const af = fs.readFileSync('src/features/inventory/components/add-item-form.tsx', 'utf8');
const dialogIdx = af.indexOf('qtyDialogVisible');
console.log('=== Quantity dialog code ===');
console.log(af.substring(dialogIdx - 50, dialogIdx + 500));

// Check search screen
console.log('\n=== search screen ===');
console.log(fs.readFileSync('src/app/inventory/search.tsx', 'utf8').substring(0, 2000));
