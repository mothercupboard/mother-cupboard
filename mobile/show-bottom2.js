const fs = require('fs');
const c = fs.readFileSync('src/app/(tabs)/shopping-list.tsx', 'utf8');
const lines = c.split('\n');
for (let i = 88; i < 130 && i < lines.length; i++) {
  console.log((i+1) + ': ' + lines[i]);
}
console.log('\n--- FeatureTip ---');
for (let i = 190; i < 230 && i < lines.length; i++) {
  console.log((i+1) + ': ' + lines[i]);
}
