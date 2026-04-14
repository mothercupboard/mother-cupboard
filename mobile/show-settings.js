const fs = require('fs');
const path = require('path');
const results = [];
function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (f === 'node_modules') return;
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.includes('setting') && f.endsWith('.tsx')) results.push(full);
  });
}
walk('src');
results.forEach(r => {
  console.log('=== ' + r + ' ===');
  console.log(fs.readFileSync(r, 'utf8').substring(0, 2000));
});
