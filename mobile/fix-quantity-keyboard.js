const fs = require('fs');
const file = 'src/features/inventory/components/add-item-form.tsx';
let c = fs.readFileSync(file, 'utf8');

// Remove keyboardType="decimal-pad" from quantity field and filter input instead
c = c.replace(
  /(<FormTextField\s[\s\S]*?label="Quantity[^"]*"[\s\S]*?)onChangeText={setQuantity}([\s\S]*?)keyboardType="decimal-pad"\s*/,
  '$1onChangeText={(text) => setQuantity(text.replace(/[^0-9.]/g, ""))}$2'
);

fs.writeFileSync(file, c);
console.log('Done');
const verify = fs.readFileSync(file, 'utf8');
const idx = verify.indexOf('Quantity');
console.log(verify.substring(idx - 10, idx + 200));
