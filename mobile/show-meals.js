const fs = require('fs');
console.log('=== saved-meals-sheet.tsx ===');
console.log(fs.readFileSync('src/features/suggest/components/saved-meals-sheet.tsx', 'utf8'));
console.log('\n=== meal-history-sheet.tsx ===');
console.log(fs.readFileSync('src/features/suggest/components/meal-history-sheet.tsx', 'utf8'));
