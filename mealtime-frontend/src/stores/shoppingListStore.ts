import { create } from 'zustand';
import { shoppingListService } from '../services/api';
import type { ShoppingList, ShoppingListItem } from '../types';

interface ShoppingListState {
  shoppingLists: ShoppingList[];
  currentShoppingList: ShoppingList | null;
  isLoading: boolean;
  error: string | null;
  // Добавляем флаги для отслеживания состояния загрузки
  isListsLoading: boolean;
  isDetailLoading: boolean;

  // Действия
  loadShoppingLists: () => Promise<void>;
  loadShoppingListById: (id: string) => Promise<void>;
  toggleShoppingListItem: (itemId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useShoppingListStore = create<ShoppingListState>((set, get) => ({
  shoppingLists: [],
  currentShoppingList: null,
  isLoading: false,
  error: null,
  isListsLoading: false,
  isDetailLoading: false,

  loadShoppingLists: async () => {
    const { isListsLoading } = get();
    // Если уже загружается, не делаем повторный запрос
    if (isListsLoading) return;

    set({ isListsLoading: true, error: null });
    try {
      const response = await shoppingListService.getAll();
      set({
        shoppingLists: response.data.results,
        isListsLoading: false
      });
    } catch (error: any) {
      set({
        error: error.message,
        isListsLoading: false
      });
    }
  },

  loadShoppingListById: async (id: string) => {
    const { isDetailLoading, currentShoppingList } = get();
    // Если уже загружается этот же список, не делаем повторный запрос
    if (isDetailLoading && currentShoppingList?.id === id) return;

    set({ isDetailLoading: true, error: null });
    try {
      const response = await shoppingListService.getById(id);
      set({
        currentShoppingList: response.data,
        isDetailLoading: false
      });
    } catch (error: any) {
      set({
        error: error.message,
        isDetailLoading: false
      });
    }
  },

  toggleShoppingListItem: async (itemId: string) => {
    const { currentShoppingList } = get();

    if (!currentShoppingList) return;

    try {
      // Сначала отправляем запрос на бэкенд
      await shoppingListService.toggleItem(itemId);

      // После успешного запроса перезагружаем текущий список с сервера
      await get().loadShoppingListById(currentShoppingList.id);

    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setError: (error: string | null) => set({ error }),
}));