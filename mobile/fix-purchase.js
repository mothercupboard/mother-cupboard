const fs = require('fs');
let shop = fs.readFileSync('src/app/(tabs)/shopping-list.tsx', 'utf8');

// Add database imports
if (!shop.includes('useDatabase')) {
  shop = shop.replace(
    "import { WarmHearthColors } from '@/components/common/paper-theme';",
    "import { WarmHearthColors } from '@/components/common/paper-theme';\nimport { useDatabase } from '@/lib/database/provider';\nimport type { InventoryItem } from '@/lib/database/models/inventory-item';"
  );
}

// Add db hook in the main component - find the component function
shop = shop.replace(
  /export default function ShoppingListScreen\(\) \{/,
  "export default function ShoppingListScreen() {\n  const db = useDatabase();"
);

// Add function to move checked items to inventory
if (!shop.includes('moveToInventory')) {
  shop = shop.replace(
    "export default function ShoppingListScreen() {\n  const db = useDatabase();",
    `export default function ShoppingListScreen() {
  const db = useDatabase();

  async function moveToInventory(checkedItems: { name: string; quantity: string }[]) {
    await db.write(async () => {
      for (const item of checkedItems) {
        // Parse quantity string like "2 pints" or "500 grams"
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
  }`
  );
}

// Update the clearChecked confirm handler to move items first
shop = shop.replace(
  "onConfirm={() => { clearChecked(); setConfirmVisible(false); }}",
  "onConfirm={async () => { const checked = items.filter(i => i.checked); await moveToInventory(checked); clearChecked(); setConfirmVisible(false); }}"
);

// Update the dialog text to tell users items will move to cupboard
shop = shop.replace(
  "Clear purchased items?",
  "Move to cupboard?"
);
shop = shop.replace(
  /This will clear \$\{count\} purchased item\$\{count !== 1 \? 's' : ''\} from your list\. You can re-add them any time\./,
  "This will add ${count} purchased item${count !== 1 ? 's' : ''} to your cupboard and remove them from this list."
);
shop = shop.replace(
  '>Clear</Button>',
  '>Move to cupboard</Button>'
);

// Update the button label
shop = shop.replace(
  '{`Clear purchased (${checkedCount})`}',
  '{`Move to cupboard (${checkedCount})`}'
);

fs.writeFileSync('src/app/(tabs)/shopping-list.tsx', shop);
console.log('Done - purchased items now move to inventory');
