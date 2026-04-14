const fs = require('fs');
const c = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');
const emailIdx = c.indexOf('email');
if (emailIdx > -1) {
  console.log('=== email references ===');
  c.split('\n').forEach((line, i) => {
    if (line.toLowerCase().includes('email') || line.includes('user')) console.log((i+1) + ': ' + line);
  });
}
console.log('\n=== Account section (search for user/account/profile) ===');
const lines = c.split('\n');
lines.forEach((line, i) => {
  if (line.includes('Account') || line.includes('account') || line.includes('user') || line.includes('User') || line.includes('email') || line.includes('Email') || line.includes('Plan') || line.includes('plan')) {
    console.log((i+1) + ': ' + line.trim());
  }
});
