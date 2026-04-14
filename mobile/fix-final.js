const fs = require('fs');

// === Fix 1: Receipt scanner - remove ALL Alert.alert inside the modal ===
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');

// Remove debug alert
rsm = rsm.replace(
  "Alert.alert('Receipt debug', 'Found ' + parsed.length + ' items. Going to review...');\n      const valid",
  "const valid"
);

// Replace "No items found" Alert with inline state
// Add a noResults state message instead of Alert
rsm = rsm.replace(
  "const [saving, setSaving] = useState(false);",
  "const [saving, setSaving] = useState(false);\n  const [parseError, setParseError] = useState<string | null>(null);"
);

// In handleChoosePhoto: replace Alert with inline message
rsm = rsm.replace(
  "Alert.alert('No items found', 'Could not find any food items. Try a clearer image of your receipt.');\n        setState('idle');",
  "setParseError('No food items found. Try a clearer image of your receipt.');\n        setState('idle');"
);

// In handleTakePhoto: same fix
rsm = rsm.replace(
  "Alert.alert('No items found', 'Could not find any food items on the receipt. Try a clearer photo.');\n        setState('idle');",
  "setParseError('No food items found on the receipt. Try a clearer photo.');\n        setState('idle');"
);

// Replace error Alerts with inline messages
rsm = rsm.replace(
  "Alert.alert('Could not read receipt', 'Please try again with a clearer, well-lit photo.');",
  "setParseError('Could not read receipt. Please try again with a clearer photo.');"
);
rsm = rsm.replace(
  "Alert.alert('Parsing failed', err instanceof Error ? err.message : 'Unknown error');",
  "setParseError('Parsing failed: ' + (err instanceof Error ? err.message : 'Unknown error'));"
);

// Clear parseError when starting a new scan
rsm = rsm.replace(
  "setState('parsing');",
  "setParseError(null);\n    setState('parsing');"
);

// Show parseError in the idle state UI
rsm = rsm.replace(
  "<Button\n              mode=\"contained\"\n              icon=\"camera\"",
  `{parseError && (
            <Text variant="bodyMedium" style={{ color: '#B03A2E', fontFamily: 'Nunito_400Regular', textAlign: 'center', marginBottom: 8 }}>
              {parseError}
            </Text>
          )}
          <Button
              mode="contained"
              icon="camera"`
);

fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
console.log('1. Receipt scanner: replaced all Alerts with inline messages');

// === Fix 2: Email - read from persisted Zustand store ===
let settings = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');

// Replace the Supabase getSession approach with direct store read + debug
settings = settings.replace(
  /const \[email, setEmail\] = useState<string \| null>\(null\);\s*useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/,
  `const sessionEmail = useAuthStore(s => s.session?.user?.email ?? null);
  const userEmail = useAuthStore(s => s.user?.email ?? null);
  const email = userEmail ?? sessionEmail;`
);

// Remove the debug alert
settings = settings.replace(
  /Alert\.alert\('Session debug'[\s\S]*?\);/,
  ""
);

fs.writeFileSync('src/app/(tabs)/settings.tsx', settings);
console.log('2. Email reads from Zustand store directly (no Supabase call)');

console.log('Done');
