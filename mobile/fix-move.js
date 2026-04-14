const fs = require('fs');
let c = fs.readFileSync('src/app/(tabs)/shopping-list.tsx', 'utf8');

// Add moveToInventory inside ListActions, right after the state declarations
c = c.replace(
  "function ListActions() {\n  const items = useShoppingListStore(s => s.items);",
  "function ListActions() {\n  const db = useDatabase();\n  const items = useShoppingListStore(s => s.items);"
);

// Add the function after the confirmVisible state
c = c.replace(
  "const [confirmVisible, setConfirmVisible] = useState(false);\n\n  const checkedCount",
  `const [confirmVisible, setConfirmVisible] = useState(false);

  async function moveToInventory(checkedItems: { name: string; quantity: string }[]) {
    await db.write(async () => {
      for (const item of checkedItems) {
        const match = item.quantity.match(/^([\\d.]+)\\s*(.*)$/);
        const qty = match ? parseFloat(match[1]) : null;
        const unit = match && match[2] ? match[2].trim() : null;
        await db.get<InventoryItem>('inventory_items').create((inv) => {
          inv.name = item.name;
          inv.quantity = qty;
          inv.unit = unit;
          inv.location = 'cupboard';
          inv.expiryType = null;
          inv.expiryDate = null;
          inv.barcode = null;
          inv.category = null;
          inv.notes = null;
          inv.isDeleted = false;
          inv.updatedAt = new Date();
        });
      }
    });
  }

  const checkedCount`
);

// Remove the duplicate moveToInventory and db from the main component if it was added there
c = c.replace(
  /export default function ShoppingListScreen\(\) \{\n  const db = useDatabase\(\);\n\n  async function moveToInventory[\s\S]*?\n  \}\n/,
  "export default function ShoppingListScreen() {\n"
);

fs.writeFileSync('src/app/(tabs)/shopping-list.tsx', c);
console.log('Done');
