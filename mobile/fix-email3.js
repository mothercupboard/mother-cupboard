const fs = require('fs');
let settings = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');

// Replace the getUser approach with getSession (local, no network)
settings = settings.replace(
  /const \[email, setEmail\] = useState<string \| null>\(null\);\s*useEffect\(\(\) => \{\s*supabase\.auth\.getUser\(\)\.then\(\(\{ data, error \}\) => \{\s*if \(data\?\.user\?\.email\) setEmail\(data\.user\.email\);\s*\}\);\s*\}, \[\]\);/,
  `const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const e = data.session?.user?.email;
      if (e) { setEmail(e); return; }
      // Fallback: network call
      supabase.auth.getUser().then(({ data: ud }) => {
        if (ud.user?.email) setEmail(ud.user.email);
      });
    });
  }, []);`
);

fs.writeFileSync('src/app/(tabs)/settings.tsx', settings);

// Verify
const result = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');
console.log('Has getSession:', result.includes('getSession'));
console.log('Has getUser fallback:', result.includes('getUser'));
