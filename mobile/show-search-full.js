const fs = require('fs');
const c = fs.readFileSync('src/lib/barcode/off-database.ts', 'utf8');
const idx = c.indexOf('searchByName');
console.log(c.substring(idx));
