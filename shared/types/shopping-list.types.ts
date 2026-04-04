// Shopping list types — populated in Story 5.x
export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  addedFromSuggestionId?: string;
  createdAt: string;
}

export interface ShoppingList {
  id: string;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
}
