const fs = require('fs');
let c = fs.readFileSync('src/lib/barcode/off-database.ts', 'utf8');

// Replace AbortSignal.timeout with AbortController + setTimeout
c = c.replace(
  "{ signal: AbortSignal.timeout(5000) },",
  "{ signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 5000); return ac.signal; })() },"
);

fs.writeFileSync('src/lib/barcode/off-database.ts', c);
console.log('Done');
