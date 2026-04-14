const fs = require('fs');
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');

// Fix: use the same mediaTypes format as handleTakePhoto
rsm = rsm.replace(
  "mediaTypes: ['images'],",
  "mediaTypes: ImagePicker.MediaTypeOptions.Images,"
);

fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
console.log('Fixed mediaTypes to use ImagePicker.MediaTypeOptions.Images');
