const fs = require('fs');
let af = fs.readFileSync('src/features/inventory/components/add-item-form.tsx', 'utf8');
af = af.replace(
  "import { Pressable, ScrollView, StyleSheet } from 'react-native';",
  "import { Pressable, ScrollView, StyleSheet, View } from 'react-native';"
);
fs.writeFileSync('src/features/inventory/components/add-item-form.tsx', af);
console.log('Has View:', af.includes("StyleSheet, View }"));
