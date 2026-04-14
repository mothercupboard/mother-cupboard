const fs = require('fs');

// === Fix email: bypass store entirely, read from Supabase directly ===
let settings = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');

// Replace the entire email logic with a direct Supabase call
settings = settings.replace(
  /const storeEmail = useAuthStore[\s\S]*?\}, \[storeEmail\]\);/,
  `const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (data?.user?.email) setEmail(data.user.email);
    });
  }, []);`
);

fs.writeFileSync('src/app/(tabs)/settings.tsx', settings);
console.log('1. Email reads directly from Supabase.getUser()');

// === Fix receipt scanner: add debug alert to see what GPT-4o returns ===
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');

// In handleChoosePhoto, show what we got before filtering
rsm = rsm.replace(
  "const valid = parsed.filter(p => p.name && p.name.trim().length > 0);",
  "Alert.alert('Receipt parsed', parsed.length + ' items found: ' + parsed.map(p => p.name).join(', '));\n      const valid = parsed.filter(p => p.name && p.name.trim().length > 0);"
);

fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
console.log('2. Receipt scanner: added debug alert showing parsed items');

console.log('Done');
