const fs = require('fs');
const c = fs.readFileSync('src/app/(tabs)/shopping-list.tsx', 'utf8');
// Find the area with FeatureTip, actions, and bottom elements
const lines = c.split('\n');
lines.forEach((line, i) => {
  if (line.includes('FeatureTip') || line.includes('actionsRow') || line.includes('install') || line.includes('Install') || line.includes('tick') || line.includes('check') || line.includes('Clear') || line.includes('clear') || line.includes('micContainer') || line.includes('ListFooter') || line.includes('footer') || line.includes('Footer')) {
    console.log((i+1) + ': ' + line.trim());
  }
});
