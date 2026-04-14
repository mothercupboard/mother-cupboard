const fs = require('fs');
let af = fs.readFileSync('src/features/inventory/components/add-item-form.tsx', 'utf8');
// Check what's imported from react-native
const rnImport = af.match(/import \{[^}]+\} from 'react-native';/);
console.log('Current RN import:', rnImport ? rnImport[0] : 'NOT FOUND');
// Add View
if (rnImport && !rnImport[0].includes('View')) {
  af = af.replace(rnImport[0], rnImport[0].replace("from 'react-native'", ", View } from 'react-native'").replace('{ ', '{ ').replace(', View }', ', View }'));
  // cleaner: just insert View before the closing brace
  af = af.replace(/import \{([^}]+)\} from 'react-native';/, (m, inner) => {
    if (inner.includes('View')) return m;
    return `import {${inner.trim()}, View } from 'react-native';`;
  });
}
fs.writeFileSync('src/features/inventory/components/add-item-form.tsx', af);
console.log('Fixed');
