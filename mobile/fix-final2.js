const fs = require('fs');

// === Fix 1: Receipt scanner - make modal non-dismissable ===
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');
rsm = rsm.replace(
  '<Modal\n        visible={visible}\n        onDismiss={handleClose}\n        contentContainerStyle={styles.modal}',
  '<Modal\n        visible={visible}\n        onDismiss={handleClose}\n        dismissable={false}\n        contentContainerStyle={styles.modal}'
);
fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
console.log('1. Modal set to dismissable={false}');

// === Fix 2: Email - store it explicitly at login time ===
// Add a dedicated email field to MMKV storage at login
let loginForm = fs.readFileSync('src/features/auth/components/login-form.tsx', 'utf8');

// Add storage import
if (!loginForm.includes("import { storage }")) {
  loginForm = loginForm.replace(
    "import { supabase } from '@/lib/supabase/client';",
    "import { supabase } from '@/lib/supabase/client';\nimport { storage } from '@/lib/storage';"
  );
}

// After successful login, save email to MMKV directly
loginForm = loginForm.replace(
  "const { data } = await supabase.auth.getSession();\n      setSession(data.session);",
  "const { data } = await supabase.auth.getSession();\n      setSession(data.session);\n      // Persist email separately so it survives session expiry\n      if (value.email) storage.set('user-email', value.email);"
);

fs.writeFileSync('src/features/auth/components/login-form.tsx', loginForm);
console.log('2a. Login saves email to MMKV');

// Settings reads from MMKV directly
let settings = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');

// Add storage import
if (!settings.includes("import { storage }")) {
  settings = settings.replace(
    "import { supabase } from '@/lib/supabase/client';",
    "import { supabase } from '@/lib/supabase/client';\nimport { storage } from '@/lib/storage';"
  );
}

// Replace the email logic with direct MMKV read
settings = settings.replace(
  /const sessionEmail = useAuthStore[\s\S]*?const email = userEmail \?\? sessionEmail;/,
  "const email = useAuthStore(s => s.user?.email) ?? storage.getString('user-email') ?? null;"
);

fs.writeFileSync('src/app/(tabs)/settings.tsx', settings);
console.log('2b. Settings reads email from MMKV fallback');

console.log('Done');
