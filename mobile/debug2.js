const fs = require('fs');
const rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');
const chooseIdx = rsm.indexOf('handleChoosePhoto');
console.log(rsm.substring(chooseIdx + 400, chooseIdx + 900));

// Check if Supabase env vars are actually set
console.log('\n=== .env Supabase vars ===');
const env = fs.readFileSync('.env', 'utf8');
env.split('\n').forEach(l => {
  if (l.includes('SUPABASE')) {
    // Redact the value but show the key exists
    const key = l.split('=')[0];
    const val = l.split('=')[1];
    console.log(key + '=' + (val ? '[SET, ' + val.length + ' chars]' : '[EMPTY]'));
  }
});

// Also check .env.local
if (fs.existsSync('.env.local')) {
  console.log('\n=== .env.local Supabase vars ===');
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
    if (l.includes('SUPABASE')) {
      const key = l.split('=')[0];
      const val = l.split('=')[1];
      console.log(key + '=' + (val ? '[SET, ' + val.length + ' chars]' : '[EMPTY]'));
    }
  });
}
