const fs = require('fs');
let s = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');
// Remove the old email line
s = s.replace(
  "const email = useAuthStore(s => s.user?.email) ?? storage.getString('user-email') ?? null;\n",
  ""
);
fs.writeFileSync('src/app/(tabs)/settings.tsx', s);
console.log('Removed duplicate');
