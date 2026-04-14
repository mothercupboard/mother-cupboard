const fs = require('fs');
let c = fs.readFileSync('src/features/suggest/components/meal-history-sheet.tsx', 'utf8');

// Fix FavouriteRow icon - show filled heart (it IS a favourite), not crossed-out
c = c.replace(
  'name="heart-off-outline" size={22} color={WarmHearthColors.textSecondary}',
  'name="heart" size={22} color={WarmHearthColors.expiryUrgent}'
);

fs.writeFileSync('src/features/suggest/components/meal-history-sheet.tsx', c);
console.log('Fixed favourite icon to filled heart');
