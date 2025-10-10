import { create } from 'zustand';
import { mealPlanService, shoppingListService } from '../services/api';
import type { MealPlan, ShoppingList } from '../types';

interface MealPlanState {
  mealPlans: MealPlan[];
  selectedDays: string[];
  isLoading: boolean;
  error: string | null;
  // Добавляем флаги для отслеживания состояния загрузки
  isRangeLoading: boolean;
  isActionLoading: boolean;
  // Добавляем хранение последних загруженных дат
  lastLoadedStartDate: string | null;
  lastLoadedEndDate: string | null;

  // Действия
  loadMealPlans: (startDate: string, endDate: string) => Promise<void>;
  addRecipeToMealPlan: (date: string, mealType: string, recipe: any, portions: number) => Promise<void>;
  removeRecipeFromMealPlan: (mealPlanId: string, recipeMealPlanId: string) => Promise<void>;
  toggleDaySelection: (date: string) => void;
  generateShoppingList: (startDate: string, endDate: string, name: string) => Promise<ShoppingList | undefined>;
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  mealPlans: [],
  selectedDays: [],
  isLoading: false,
  error: null,
  isRangeLoading: false,
  isActionLoading: false,
  lastLoadedStartDate: null,
  lastLoadedEndDate: null,

  loadMealPlans: async (startDate: string, endDate: string) => {
    const { isRangeLoading } = get();
    // Если уже загружается, не делаем повторный запрос
    if (isRangeLoading) return;

    set({ isRangeLoading: true, error: null });
    try {
      const response = await mealPlanService.getByRange(startDate, endDate);
      set({
        mealPlans: response.data,
        isRangeLoading: false,
        lastLoadedStartDate: startDate,
        lastLoadedEndDate: endDate
      });
    } catch (error: any) {
      set({
        error: error.message,
        isRangeLoading: false
      });
    }
  },

  addRecipeToMealPlan: async (date: string, mealType: string, recipe: any, portions: number) => {
    const { isActionLoading, lastLoadedStartDate, lastLoadedEndDate } = get();
    if (isActionLoading) return;

    set({ isActionLoading: true, error: null });
    try {
      await mealPlanService.addRecipeToDate(date, mealType, recipe.id, portions);
      // После добавления рецепта перезагружаем планы с теми же датами
      if (lastLoadedStartDate && lastLoadedEndDate) {
        await get().loadMealPlans(lastLoadedStartDate, lastLoadedEndDate);
      }
      set({ isActionLoading: false });
    } catch (error: any) {
      set({
        error: error.message,
        isActionLoading: false
      });
    }
  },

  removeRecipeFromMealPlan: async (mealPlanId: string, recipeMealPlanId: string) => {
    const { isActionLoading, lastLoadedStartDate, lastLoadedEndDate } = get();
    if (isActionLoading) return;

    set({ isActionLoading: true, error: null });
    try {
      await mealPlanService.removeRecipe(mealPlanId, recipeMealPlanId);
      // После удаления рецепта перезагружаем планы с теми же датами
      if (lastLoadedStartDate && lastLoadedEndDate) {
        await get().loadMealPlans(lastLoadedStartDate, lastLoadedEndDate);
      }
      set({ isActionLoading: false });
    } catch (error: any) {
      set({
        error: error.message,
        isActionLoading: false
      });
    }
  },

  toggleDaySelection: (date: string) => {
    // Локальное действие - не требует API вызова
    const { selectedDays } = get();
    const newSelectedDays = selectedDays.includes(date)
      ? selectedDays.filter(d => d !== date)
      : [...selectedDays, date];
    set({ selectedDays: newSelectedDays });
  },

  generateShoppingList: async (startDate: string, endDate: string, name: string) => {
    const { isActionLoading } = get();
    if (isActionLoading) return;

    set({ isActionLoading: true, error: null });
    try {
      const response = await shoppingListService.generate({
        start_date: startDate,
        end_date: endDate,
        name: name
      });
      set({ isActionLoading: false });
      return response.data; // возвращаем данные для использования в компоненте
    } catch (error: any) {
      set({
        error: error.message,
        isActionLoading: false
      });
      throw error; // пробрасываем ошибку для обработки в компоненте
    }
  },
}));