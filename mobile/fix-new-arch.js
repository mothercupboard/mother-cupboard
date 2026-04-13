/**
 * Disables React Native New Architecture in app.config.ts.
 * newArchEnabled: true causes TextInput to focus (cursor flashes) but
 * silently swallow all keyboard events and gesture-based editing on iOS.
 *
 * Run from: C:\Users\mandr\dev\mother-cupboard\mobile\
 */
const fs = require('fs');

const file = 'app.config.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('newArchEnabled: true')) {
  console.log('newArchEnabled: true not found — already patched or different format?');
  console.log(content.match(/newArchEnabled.*/)?.[0] ?? 'no newArchEnabled line found');
  process.exit(1);
}

content = content.replace('newArchEnabled: true', 'newArchEnabled: false');
fs.writeFileSync(file, content, 'utf8');
console.log('✓ app.config.ts: newArchEnabled: true → false');
console.log('\nNow build:');
console.log('  git add -A');
console.log('  git commit -m "fix: disable new architecture to restore TextInput on iOS"');
console.log('  eas build --platform ios --profile preview --non-interactive');
