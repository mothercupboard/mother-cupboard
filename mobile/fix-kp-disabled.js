const fs = require('fs');
const file = 'src/app/_layout.tsx';
let c = fs.readFileSync(file, 'utf8');
c = c.replace('<KeyboardProvider>', '<KeyboardProvider enabled={false}>');
fs.writeFileSync(file, c);
console.log('Done');
