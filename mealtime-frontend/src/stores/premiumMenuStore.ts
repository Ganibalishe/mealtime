import { create } from 'zustand';
import api from '../services/api';
import type { PremiumMealPlan, PremiumMenuFilters } from '../types';

interface PremiumMenuStore {
  // Состояние
  menus: PremiumMealPlan[];
  filteredMenus: PremiumMealPlan[];
  isLoading: boolean;
  error: string | null;
  nextPage: string | null;
  isLoadingMore: boolean;
  isSearchLoading: boolean;
  currentMenu: PremiumMealPlan | null;
  currentMenuLoading: boolean;
  currentMenuError: string | null;

  // Действия
  loadMenus: () => Promise<void>;
  loadNextPage: () => Promise<void>;
  applyFilters: (filters: PremiumMenuFilters) => Promise<void>;
  activateMenu: (menuId: string) => Promise<void>;
  createMealPlan: (menuId: string, startDate: string) => Promise<void>;
  clearError: () => void;
  clearFilters: () => void;
  loadMenuById: (menuId: string) => Promise<void>;
  clearCurrentMenu: () => void;
  createMealPlanFromDate: (menuId: string, startDate: string, portions: number) => Promise<void>;
  updateCurrentMenu: (menuId: string, updates: Partial<PremiumMealPlan>) => void;
}

export const usePremiumMenuStore = create<PremiumMenuStore>((set, get) => ({
  // Начальное состояние
  menus: [],
  filteredMenus: [],
  isLoading: false,
  error: null,
  nextPage: null,
  isLoadingMore: false,
  isSearchLoading: false,
  currentMenu: null,
  currentMenuLoading: false,
  currentMenuError: null,

  // Загрузка всех меню
  loadMenus: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/premium-meal-plans/');
      set({
        menus: response.data.results || response.data,
        filteredMenus: response.data.results || response.data,
        isLoading: false,
        nextPage: response.data.next || null
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Ошибка загрузки меню',
        isLoading: false
      });
    }
  },

  // Загрузка следующей страницы
  loadNextPage: async () => {
    const { nextPage, isLoadingMore } = get();
    if (!nextPage || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const response = await api.get(nextPage);
      const currentMenus = get().menus;
      const newMenus = response.data.results || response.data;

      set({
        menus: [...currentMenus, ...newMenus],
        filteredMenus: [...currentMenus, ...newMenus],
        isLoadingMore: false,
        nextPage: response.data.next || null
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Ошибка загрузки',
        isLoadingMore: false
      });
    }
  },

  // Применение фильтров
  applyFilters: async (filters: PremiumMenuFilters) => {
    set({ isSearchLoading: true, error: null });
    try {
      const params = new URLSearchParams();

      if (filters.q) params.append('q', filters.q);
      if (filters.tags?.length) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }
      if (filters.is_free !== undefined) {
        params.append('is_free', filters.is_free.toString());
      }
      if (filters.duration_min) {
        params.append('duration_min', filters.duration_min.toString());
      }
      if (filters.duration_max) {
        params.append('duration_max', filters.duration_max.toString());
      }

      const response = await api.get(`/premium-meal-plans/?${params}`);
      set({
        filteredMenus: response.data.results || response.data,
        isSearchLoading: false,
        nextPage: response.data.next || null
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Ошибка поиска',
        isSearchLoading: false
      });
    }
  },

  updateCurrentMenu: (menuId: string, updates: Partial<PremiumMealPlan>) => {
    const { currentMenu } = get();
    if (currentMenu && currentMenu.id === menuId) {
      set({
        currentMenu: { ...currentMenu, ...updates }
      });
    }
  },

  // Активация меню - ИСПРАВЛЕННАЯ ВЕРСИЯ
  activateMenu: async (menuId: string) => {
    try {
      const response = await api.post(`/premium-meal-plans/${menuId}/activate/`);
      const { currentMenu } = get();

      // ИСПРАВЛЕНИЕ: Обновляем статус без создания дубликатов в UI
      // Просто перезагружаем данные, чтобы получить актуальное состояние
      await get().loadMenus();

      if (currentMenu && currentMenu.id === menuId) {
        await get().loadMenuById(menuId);
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Ошибка активации меню');
    }
  },

  // Создание плана питания из меню
  createMealPlan: async (menuId: string, startDate: string) => {
    try {
      const response = await api.post('/premium-meal-plans/create-meal-plan/', {
        premium_meal_plan_id: menuId,
        start_date: startDate
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Ошибка создания плана питания');
    }
  },

  loadMenuById: async (menuId: string) => {
    set({ currentMenuLoading: true, currentMenuError: null });
    try {
      const response = await api.get(`/premium-meal-plans/${menuId}/`);
      set({
        currentMenu: response.data,
        currentMenuLoading: false
      });
    } catch (error: any) {
      set({
        currentMenuError: error.response?.data?.error || 'Ошибка загрузки меню',
        currentMenuLoading: false
      });
    }
  },

  // ОБНОВЛЕНО: добавлен параметр portions
  createMealPlanFromDate: async (menuId: string, startDate: string, portions: number) => {
    try {
      const response = await api.post(`/premium-meal-plans/${menuId}/create_meal_plan_from_date/`, {
        start_date: startDate,
        portions: portions // Добавляем количество порций
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Ошибка создания плана питания');
    }
  },

  // Очистка ошибок
  clearError: () => set({ error: null }),

  // Сброс фильтров
  clearFilters: () => {
    const { menus } = get();
    set({ filteredMenus: menus });
  },

  clearCurrentMenu: () => set({
    currentMenu: null,
    currentMenuError: null
  }),
}));