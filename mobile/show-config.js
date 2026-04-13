/**
 * Shows app.json and key package versions.
 * Run from: C:\Users\mandr\dev\mother-cupboard\mobile\
 */
const fs = require('fs');

function showFile(file) {
  if (!fs.existsSync(file)) { console.log(`\nMISSING: ${file}`); return; }
  const content = fs.readFileSync(file, 'utf8');
  console.log(`\n${'='.repeat(60)}`);
  console.log(file);
  console.log('='.repeat(60));
  console.log(content);
}

// Show app.json
showFile('app.json');

// Show key package versions
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('\n' + '='.repeat(60));
console.log('KEY PACKAGE VERSIONS');
console.log('='.repeat(60));
const keys = [
  'expo', 'react-native', 'expo-router',
  'react-native-paper', 'react-native-gesture-handler',
  '@nozbe/watermelondb', 'expo-av',
  'react-native-mmkv', 'zustand'
];
keys.forEach(k => {
  const v = pkg.dependencies?.[k] || pkg.devDependencies?.[k] || 'NOT FOUND';
  console.log(`  ${k}: ${v}`);
});
