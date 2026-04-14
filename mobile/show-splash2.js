const fs = require('fs');
const config = fs.readFileSync('app.config.ts', 'utf8');
const splashIdx = config.indexOf('splash');
console.log('=== splash config area ===');
console.log(config.substring(splashIdx - 50, splashIdx + 400));

console.log('\n=== receipt scanner (first 1500) ===');
console.log(fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8').substring(0, 1500));
