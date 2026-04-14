const fs = require('fs');
let c = fs.readFileSync('src/app/(tabs)/shopping-list.tsx', 'utf8');

// Move ListActions from below SectionList to above it
c = c.replace(
  "            <ListActions />\n          </>",
  "          </>"
);
c = c.replace(
  "            <SectionList",
  "            <ListActions />\n            <SectionList"
);

fs.writeFileSync('src/app/(tabs)/shopping-list.tsx', c);
console.log('Done - ListActions moved above SectionList');
