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

  // ИСПРАВЛЕНО: загрузка тегов с обработкой пагинированного ответа
  loadTags: async () => {
    const { isTagsLoading } = get();
    if (isTagsLoading) return;

    set({ isTagsLoading: true, error: null });
    try {
      const response = await recipeService.getTags();
      // response.data теперь содержит results из пагинированного ответа
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
}));