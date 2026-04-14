const fs = require('fs');
const path = require('path');
const results = [];
function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes('react-native-keyboard-controller')) results.push(full);
    }
  });
}
walk('src');
console.log(results.join('\n'));
