const fs = require('fs');

// 1. Fix _layout.tsx - remove KeyboardProvider
const layout = 'src/app/_layout.tsx';
let c = fs.readFileSync(layout, 'utf8');
c = c.replace(/import \{ KeyboardProvider \} from 'react-native-keyboard-controller';\r?\n/, '');
c = c.replace(/<KeyboardProvider[^>]*>\s*/, '');
c = c.replace(/\s*<\/KeyboardProvider>/, '');
fs.writeFileSync(layout, c);
console.log('_layout.tsx cleaned');

// 2. Check app.config.ts for keyboard-controller plugin
const config = fs.readFileSync('app.config.ts', 'utf8');
if (config.includes('keyboard-controller')) {
  console.log('WARNING: keyboard-controller found in app.config.ts - needs manual cleanup');
} else {
  console.log('app.config.ts is clean');
}

// 3. Check form-text-field still clean
const ftf = fs.readFileSync('src/components/common/form-text-field.tsx', 'utf8');
if (ftf.includes('keyboard-controller')) {
  console.log('WARNING: keyboard-controller in form-text-field.tsx');
} else {
  console.log('form-text-field.tsx is clean');
}
