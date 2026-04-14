const fs = require('fs');

// Fix expiry date: remove auto-formatting, accept raw digits
let addForm = fs.readFileSync('src/features/inventory/components/add-item-form.tsx', 'utf8');

// Replace the auto-formatter with plain text handler
addForm = addForm.replace(
  /const handleExpiryDateChange = \(text: string\) => \{[\s\S]*?setExpiryDate\(formatted\);\s*\};/,
  "const handleExpiryDateChange = (text: string) => {\n    // Accept digits and slashes, max 8 chars (DD/MM/YY)\n    const cleaned = text.replace(/[^0-9\\/]/g, '').slice(0, 8);\n    setExpiryDate(cleaned);\n  };"
);

fs.writeFileSync('src/features/inventory/components/add-item-form.tsx', addForm);
console.log('1. Simplified expiry date handler in add form');

// Update parseDateGB regex to accept both DD/MM/YY and DDMMYY
let utils = fs.readFileSync('src/features/inventory/inventory.utils.ts', 'utf8');
// Find the DATE_GB_RE regex
const reMatch = utils.match(/const DATE_GB_RE\s*=\s*\/([^/]+)\//);
if (reMatch) {
  console.log('Current regex:', reMatch[0]);
}
// Replace it to accept optional slashes
utils = utils.replace(
  /const DATE_GB_RE\s*=\s*\/[^;]+;/,
  "const DATE_GB_RE = /^(\\d{1,2})\\/?\\s*(\\d{1,2})\\/?\\s*(\\d{2,4})$/;"
);

// Fix the year handling - 2-digit years need 2000 added
const oldParse = "const d = new Date(Number(year), Number(month) - 1, Number(day));";
if (utils.includes(oldParse)) {
  utils = utils.replace(
    oldParse,
    "const yr = Number(year) < 100 ? 2000 + Number(year) : Number(year);\n  const d = new Date(yr, Number(month) - 1, Number(day));"
  );
  console.log('2. Updated parseDateGB to handle DDMMYY and 2-digit years');
}

fs.writeFileSync('src/features/inventory/inventory.utils.ts', utils);

console.log('Done');
