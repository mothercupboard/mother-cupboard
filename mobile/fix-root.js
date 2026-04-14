const fs = require('fs');

// === Receipt scanner: pick image BEFORE modal opens ===
// Change inventory.tsx FAB to pick image first, then pass to modal
let inv = fs.readFileSync('src/app/(tabs)/inventory.tsx', 'utf8');

// Add ImagePicker import
if (!inv.includes('ImagePicker')) {
  inv = inv.replace(
    "import { router } from 'expo-router';",
    "import { router } from 'expo-router';\nimport * as ImagePicker from 'expo-image-picker';"
  );
}

// Add state for the receipt image
inv = inv.replace(
  "const [receiptVisible, setReceiptVisible] = useState(false);",
  "const [receiptVisible, setReceiptVisible] = useState(false);\n  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);"
);

// Change FAB action to pick image first
inv = inv.replace(
  "{ icon: 'receipt', label: 'Scan receipt', onPress: () => setReceiptVisible(true) },",
  `{ icon: 'receipt', label: 'Scan receipt', onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              base64: true,
              quality: 0.8,
            });
            if (result.canceled || !result.assets[0]?.base64) return;
            setReceiptBase64(result.assets[0].base64);
            setReceiptVisible(true);
          } },`
);

// Pass the base64 to the modal
inv = inv.replace(
  '<ReceiptScannerModal visible={receiptVisible} onDismiss={() => setReceiptVisible(false)} />',
  '<ReceiptScannerModal visible={receiptVisible} initialBase64={receiptBase64} onDismiss={() => { setReceiptVisible(false); setReceiptBase64(null); }} />'
);

fs.writeFileSync('src/app/(tabs)/inventory.tsx', inv);
console.log('1. Inventory: image picked before modal opens');

// Update ReceiptScannerModal to accept initialBase64 prop and auto-parse
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');

// Add useEffect import
if (!rsm.includes('useEffect')) {
  rsm = rsm.replace(
    "import { useState } from 'react';",
    "import { useEffect, useState } from 'react';"
  );
}

// Update Props type
rsm = rsm.replace(
  "interface Props {\n  visible: boolean;\n  onDismiss: () => void;\n}",
  "interface Props {\n  visible: boolean;\n  initialBase64?: string | null;\n  onDismiss: () => void;\n}"
);

// Update component to accept initialBase64
rsm = rsm.replace(
  "export function ReceiptScannerModal({ visible, onDismiss }: Props) {",
  "export function ReceiptScannerModal({ visible, initialBase64, onDismiss }: Props) {"
);

// Add useEffect to auto-parse when initialBase64 is provided
rsm = rsm.replace(
  "const [saving, setSaving] = useState(false);",
  `const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && initialBase64) {
      setParseError(null);
      setState('parsing');
      parseReceiptImage(initialBase64)
        .then(parsed => {
          const valid = parsed.filter(p => p.name && p.name.trim().length > 0);
          if (valid.length === 0) {
            setParseError('No food items found. Try a clearer image.');
            setState('idle');
            return;
          }
          setItems(valid.map((p, i) => ({ ...p, id: String(i) })));
          setState('review');
        })
        .catch(err => {
          setParseError('Parsing failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
          setState('idle');
        });
    }
  }, [visible, initialBase64]);`
);

fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
console.log('2. Receipt modal: auto-parses initialBase64 on open');

// === Email: debug what is actually in MMKV ===
// Add a raw MMKV read to settings to see what auth-store contains
let settings = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');

// Replace email logic with raw MMKV read + multiple fallbacks
settings = settings.replace(
  /const storeEmail = useAuthStore[\s\S]*?const email = userEmail \?\? sessionEmail;/,
  ""
);
settings = settings.replace(
  /const sessionEmail[\s\S]*?const email = userEmail \?\? sessionEmail;/,
  ""
);

// Find whatever email const exists and replace it
const emailMatch = settings.match(/const (?:email|storeEmail)[\s\S]*?(?:;|\n\n)/);
if (emailMatch) {
  console.log('Found email pattern:', emailMatch[0].substring(0, 80));
}

// Just do a clean replacement of the full email block
settings = settings.replace(
  /const \[email, setEmail\][\s\S]*?\}, \[storeEmail\]\);/,
  ""
);

// Now add clean email logic
settings = settings.replace(
  "const notificationsEnabled = useNotificationStatus();",
  `// Read email from every possible source
  const authUser = useAuthStore(s => s.user);
  const authSession = useAuthStore(s => s.session);
  const mmkvEmail = storage.getString('user-email');
  let derivedEmail = authUser?.email ?? authSession?.user?.email ?? mmkvEmail ?? null;
  // Last resort: decode JWT
  if (!derivedEmail && authSession?.access_token) {
    try {
      const parts = authSession.access_token.split('.');
      if (parts[1]) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        derivedEmail = payload.email ?? null;
      }
    } catch {}
  }
  const email = derivedEmail;
  const notificationsEnabled = useNotificationStatus();`
);

// Remove the old useState/useEffect for email if still present
settings = settings.replace(/const \[email, setEmail\] = useState<string \| null>[\s\S]*?\}, \[\]\);/, '');

fs.writeFileSync('src/app/(tabs)/settings.tsx', settings);
console.log('3. Settings: email from auth store + JWT decode fallback');

console.log('Done');
