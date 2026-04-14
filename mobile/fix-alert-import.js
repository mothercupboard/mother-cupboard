const fs = require('fs');
let s = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');
s = s.replace(
  "import { AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';",
  "import { Alert, AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';"
);
fs.writeFileSync('src/app/(tabs)/settings.tsx', s);
console.log('Has Alert import:', s.includes("Alert, AppState"));
