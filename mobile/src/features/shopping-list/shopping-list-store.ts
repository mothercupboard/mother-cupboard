import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

let nextId = Date.now();
function genId(): string {
  return String(nextId++);
}

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  addedFromSuggestionId?: string;
  createdAt: number;
};

type ShoppingListStore = {
  items: ShoppingItem[];
  addItem: (name: string, quantity?: string, suggestionId?: string) => void;
  /** Bulk-add missing ingredients, skipping any already on the list. Returns count added. */
  addMissingIngredients: (names: string[], suggestionId?: string) => number;
  removeItem: (id: string) => void;
  toggleChecked: (id: string) => void;
  checkAll: () => void;
  uncheckAll: () => void;
  clearChecked: () => void;
  clearAll: () => void;
};

export const useShoppingListStore = create<ShoppingListStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (name: string, quantity?: string, suggestionId?: string) =>
        set(state => ({
          items: [
            ...state.items,
            {
              id: genId(),
              name: name.trim(),
              quantity: quantity?.trim() ?? '',
              checked: false,
              addedFromSuggestionId: suggestionId,
              createdAt: Date.now(),
            },
          ],
        })),

      addMissingIngredients: (names: string[], suggestionId?: string) => {
        const state = get();
        const existingNames = new Set(state.items.map(i => i.name.toLowerCase()));
        const toAdd = names
          .map(n => n.trim())
          .filter(n => n && !existingNames.has(n.toLowerCase()));

        if (toAdd.length > 0) {
          set({
            items: [
              ...state.items,
              ...toAdd.map(name => ({
                id: genId(),
                name,
                quantity: '',
                checked: false,
                addedFromSuggestionId: suggestionId,
                createdAt: Date.now(),
              })),
            ],
          });
        }

        return toAdd.length;
      },

      removeItem: (id: string) =>
        set(state => ({
          items: state.items.filter(i => i.id !== id),
        })),

      toggleChecked: (id: string) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id ? { ...i, checked: !i.checked } : i,
          ),
        })),

      checkAll: () =>
        set(state => ({
          items: state.items.map(i => i.checked ? i : { ...i, checked: true }),
        })),

      uncheckAll: () =>
        set(state => ({
          items: state.items.map(i => i.checked ? { ...i, checked: false } : i),
        })),

      clearChecked: () =>
        set(state => ({
          items: state.items.filter(i => !i.checked),
        })),

      clearAll: () => set({ items: [] }),
    }),
    {
      name: 'shopping-list-store',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);

