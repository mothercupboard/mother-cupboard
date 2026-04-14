const fs = require('fs');
const file = 'src/app/_layout.tsx';
let c = fs.readFileSync(file, 'utf8');

// Add import after last import line
const lastImport = c.lastIndexOf("import ");
const endOfLastImport = c.indexOf("\n", lastImport);
c = c.slice(0, endOfLastImport + 1) +
  "import { KeyboardProvider } from 'react-native-keyboard-controller';\n" +
  c.slice(endOfLastImport + 1);

// Wrap outermost provider - find SafeAreaProvider and wrap it
c = c.replace('<SafeAreaProvider>', '<KeyboardProvider>\n      <SafeAreaProvider>');

// Find the matching closing tag area
c = c.replace('</SafeAreaProvider>', '</SafeAreaProvider>\n      </KeyboardProvider>');

fs.writeFileSync(file, c);
console.log('Done');

// Verify
const verify = fs.readFileSync(file, 'utf8');
console.log('Has KeyboardProvider import:', verify.includes("from 'react-native-keyboard-controller'"));
console.log('Has KeyboardProvider JSX:', verify.includes('<KeyboardProvider>'));
