const fs = require('fs');

// Fix: Settings screen fetches user email directly from Supabase if not in store
let settings = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');

// Add supabase import if not present
if (!settings.includes('supabase')) {
  settings = settings.replace(
    "import { useAuthStore } from '@/features/auth/auth-store';",
    "import { useAuthStore } from '@/features/auth/auth-store';\nimport { supabase } from '@/lib/supabase/client';"
  );
}

// Replace the simple email read with a useEffect that fetches from Supabase
settings = settings.replace(
  "const email = useAuthStore(s => s.user?.email ?? s.session?.user?.email ?? null);",
  `const storeEmail = useAuthStore(s => s.user?.email ?? s.session?.user?.email ?? null);
  const [email, setEmail] = useState<string | null>(storeEmail);
  useEffect(() => {
    if (!storeEmail) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) setEmail(data.user.email);
      });
    }
  }, [storeEmail]);`
);

fs.writeFileSync('src/app/(tabs)/settings.tsx', settings);
console.log('Settings: email now fetches from Supabase directly if missing from store');
