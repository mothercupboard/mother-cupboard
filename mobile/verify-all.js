const fs = require('fs');

// Check login form - does it have the password dialog?
const login = fs.readFileSync('src/features/auth/components/login-form.tsx', 'utf8');
console.log('Login has Dialog:', login.includes('pwDialogVisible'));
console.log('Login has Pressable:', login.includes('Pressable'));
const pwIdx = login.indexOf('password');
console.log('\n=== Password field area ===');
const lines = login.split('\n');
lines.forEach((l, i) => {
  if (l.includes('password') || l.includes('Password') || l.includes('pwDialog') || l.includes('Pressable')) {
    console.log((i+1) + ': ' + l.trim());
  }
});

// Check receipt scanner - does it have initialBase64?
const rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');
console.log('\nReceipt has initialBase64:', rsm.includes('initialBase64'));
console.log('Receipt has useEffect:', rsm.includes('useEffect'));
console.log('Receipt has dismissable:', rsm.includes('dismissable'));

// Check inventory - does FAB launch picker?
const inv = fs.readFileSync('src/app/(tabs)/inventory.tsx', 'utf8');
console.log('\nInventory has ImagePicker:', inv.includes('ImagePicker'));
console.log('Inventory has receiptBase64:', inv.includes('receiptBase64'));

// Check settings email logic
const settings = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');
console.log('\nSettings has JWT decode:', settings.includes('atob'));
console.log('Settings has derivedEmail:', settings.includes('derivedEmail'));
