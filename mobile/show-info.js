const fs = require('fs');

// Receipt scanner - check for photo library option
const rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');
console.log('Has choosePhoto/pickImage:', rsm.includes('launchImageLibrary') || rsm.includes('pickImage') || rsm.includes('choosePhoto') || rsm.includes('MediaType'));
const photoIdx = rsm.indexOf('Photo');
if (photoIdx > -1) console.log('Photo context:', rsm.substring(photoIdx - 50, photoIdx + 100));
// Show the idle state UI (the buttons)
const idleIdx = rsm.indexOf("'idle'");
const lastIdleIdx = rsm.lastIndexOf("idle");
console.log('\n=== idle state render ===');
const renderIdx = rsm.indexOf('state === ');
console.log(rsm.substring(renderIdx - 20, renderIdx + 500));

// parseDateGB function
const utils = fs.readFileSync('src/features/inventory/inventory.utils.ts', 'utf8');
const parseIdx = utils.indexOf('parseDateGB');
console.log('\n=== parseDateGB ===');
console.log(utils.substring(parseIdx, parseIdx + 400));
