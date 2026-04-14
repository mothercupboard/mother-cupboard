const fs = require('fs');

// Check the receipt scanner handleChoosePhoto function
const rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');
const chooseIdx = rsm.indexOf('handleChoosePhoto');
console.log('=== handleChoosePhoto ===');
console.log(rsm.substring(chooseIdx, chooseIdx + 600));

// Check the settings email code
const settings = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');
const emailIdx = settings.indexOf('email');
console.log('\n=== Settings email area ===');
const lines = settings.split('\n');
lines.forEach((l, i) => {
  if (l.includes('email') || l.includes('Email') || l.includes('supabase') || l.includes('getUser') || l.includes('getSession')) {
    console.log((i+1) + ': ' + l.trim());
  }
});
