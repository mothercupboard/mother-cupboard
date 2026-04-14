const fs = require('fs');
// Check current splash config
const config = fs.readFileSync('app.config.ts', 'utf8');
const splashLines = config.split('\n').filter(l => l.includes('splash') || l.includes('Splash'));
console.log('=== Current splash config ===');
console.log(splashLines.join('\n'));

// Check existing assets
if (fs.existsSync('assets')) {
  console.log('\n=== assets/ contents ===');
  fs.readdirSync('assets').forEach(f => console.log('  ' + f));
}
if (fs.existsSync('src/assets')) {
  console.log('\n=== src/assets/ contents ===');
  fs.readdirSync('src/assets').forEach(f => console.log('  ' + f));
}
