const fs = require('fs');
const c = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');
const lines = c.split('\n');
for (let i = 245; i < 260; i++) {
  console.log((i+1) + ': ' + lines[i]);
}

// Check _layout.tsx for session restoration
const layout = fs.readFileSync('src/app/_layout.tsx', 'utf8');
const authLines = layout.split('\n');
authLines.forEach((line, i) => {
  if (line.includes('session') || line.includes('Session') || line.includes('auth') || line.includes('Auth') || line.includes('onAuthStateChange')) {
    console.log('layout ' + (i+1) + ': ' + line.trim());
  }
});
