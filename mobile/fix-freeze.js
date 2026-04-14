const fs = require('fs');
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');
rsm = rsm.replace('dismissable={false}', 'dismissable={true}');
rsm = rsm.replace(
  "<Text variant=\"bodySmall\" style={styles.loadingSubtext}>\n              This takes a few seconds\n            </Text>",
  "<Text variant=\"bodySmall\" style={styles.loadingSubtext}>\n              This takes a few seconds\n            </Text>\n            <Button mode=\"text\" onPress={handleClose} labelStyle={styles.cancelLabel}>\n              Cancel\n            </Button>"
);
fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
console.log('Done');
