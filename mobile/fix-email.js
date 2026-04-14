const fs = require('fs');
let c = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');
c = c.replace(
  "const email = useAuthStore(s => s.session?.user.email ?? null);",
  "const email = useAuthStore(s => s.user?.email ?? s.session?.user?.email ?? null);"
);
fs.writeFileSync('src/app/(tabs)/settings.tsx', c);
console.log('Done');
