const fs = require('fs');
const file = 'src/features/inventory/components/add-item-form.tsx';
let c = fs.readFileSync(file, 'utf8');

// Replace filtered onChangeText with plain setQuantity, matching edit-item-form exactly
c = c.replace(
  'onChangeText={(text) => setQuantity(text.replace(/[^0-9.]/g, ""))}',
  'onChangeText={setQuantity}'
);

fs.writeFileSync(file, c);

// Verify
const v = fs.readFileSync(file, 'utf8');
const idx = v.indexOf('label="Quantity');
console.log(v.substring(idx - 5, idx + 220));
