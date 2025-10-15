// stores/recipeStore.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { create } from 'zustand';
import { recipeService } from '../services/api';
import type { Recipe, RecipeFilters, Tag } from '../types';

interface RecipeState {
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  selectedRecipe: Recipe | null;
  filters: RecipeFilters;
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
  isListLoading: boolean;
  isSearchLoading: boolean;
  isDetailLoading: boolean;
  isTagsLoading: boolean;

  loadRecipes: () => Promise<void>;
  searchRecipes: (query: string) => Promise<void>;
  applyFilters: (filters: RecipeFilters) => Promise<void>;
  clearFilters: () => void;
  loadTags: () => Promise<void>;
  getPopularTags: () => Tag[];
  // ИСПРАВИЛИ ТИП - теперь возвращает Recipe или бросает ошибку
  getRecipeById: (id: string) => Promise<Recipe>;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  filteredRecipes: [],
  selectedRecipe: null,
  filters: {},
  tags: [],
  isLoading: false,
  error: null,
  isListLoading: false,
  isSearchLoading: false,
  isDetailLoading: false,
  isTagsLoading: false,

  loadRecipes: async () => {
    const { isListLoading } = get();
    if (isListLoading) return;

    set({ isListLoading: true, error: null });
    try {
      const response = await recipeService.getAll();
      set({
        recipes: response.data.results,
        filteredRecipes: response.data.results,
        isListLoading: false
      });
    } catch (error: any) {
      set({
        error: error.message,
        isListLoading: false
      });
    }
  },

  searchRecipes: async (query: string) => {
    const { isSearchLoading } = get();
    if (isSearchLoading) return;

    set({ isSearchLoading: true, error: null });
    try {
      const response = await recipeService.search({ q: query });
      set({
        filteredRecipes: response.data.results,
        isSearchLoading: false
      });
    } catch (error: any) {
      set({
        error: error.message,
        isSearchLoading: false
      });
    }
  },

  applyFilters: async (filters: RecipeFilters) => {
    const { isSearchLoading } = get();
    if (isSearchLoading) return;

    set({ isSearchLoading: true, error: null });
    try {
      const response = await recipeService.search(filters);
      set({
        filteredRecipes: response.data.results,
        filters,
        isSearchLoading: false
      });
    } catch (error: any) {
      set({
        error: error.message,
        isSearchLoading: false
      });
    }
  },

  clearFilters: () => {
    const { recipes } = get();
    set({
      filteredRecipes: recipes,
      filters: {}
    });
  },

  loadTags: async () => {
    const { isTagsLoading } = get();
    if (isTagsLoading) return;

    set({ isTagsLoading: true, error: null });
    try {
      const response = await recipeService.getTags();
      const tagsData = response.data;

      set({
        tags: tagsData,
        isTagsLoading: false
      });
    } catch (error: any) {
      set({
        error: error.message,
        isTagsLoading: false,
        tags: []
      });
    }
  },

  getPopularTags: () => {
    const { tags } = get();
    return Array.isArray(tags) ? tags.slice(0, 15) : [];
  },

  // ИСПРАВИЛИ: Убрали проверку isDetailLoading и всегда возвращаем Recipe или бросаем ошибку
  getRecipeById: async (id: string): Promise<Recipe> => {
    set({ isDetailLoading: true, error: null, selectedRecipe: null });
    try {
      const response = await recipeService.getById(id);
      const recipe = response.data;
      set({ selectedRecipe: recipe, isDetailLoading: false });
      return recipe;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Ошибка загрузки рецепта';
      set({ error: errorMessage, isDetailLoading: false });
      // Бросаем ошибку вместо возврата undefined
      throw new Error(errorMessage);
    }
  },
}));