const fs = require('fs');

// === Debug email: show what Supabase returns ===
let settings = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');

// Add Alert import if needed
if (!settings.includes("Alert")) {
  settings = settings.replace(
    "import { AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';",
    "import { Alert, AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';"
  );
}

settings = settings.replace(
  "supabase.auth.getSession().then(({ data }) => {",
  "supabase.auth.getSession().then(({ data }) => {\n      Alert.alert('Session debug', JSON.stringify({ email: data.session?.user?.email, hasSession: !!data.session, hasUser: !!data.session?.user }));"
);

fs.writeFileSync('src/app/(tabs)/settings.tsx', settings);
console.log('1. Email debug alert added');

// === Keep receipt debug alert too ===
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');
// Add back debug alert before the valid filter
if (!rsm.includes('Receipt debug')) {
  rsm = rsm.replace(
    "const valid = parsed.filter(p => p.name && p.name.trim().length > 0);",
    "Alert.alert('Receipt debug', 'Found ' + parsed.length + ' items. Going to review...');\n      const valid = parsed.filter(p => p.name && p.name.trim().length > 0);"
  );
}
fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
console.log('2. Receipt debug alert added');

console.log('Done');
