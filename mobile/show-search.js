const fs = require('fs');
const offDb = fs.readFileSync('src/lib/barcode/off-database.ts', 'utf8');
const idx = offDb.indexOf('export async function searchByName');
console.log(offDb.substring(idx, idx + 1200));
