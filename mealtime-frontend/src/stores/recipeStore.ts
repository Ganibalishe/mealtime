// stores/recipeStore.ts - УБЕДИТЕСЬ ЧТО ВСЕ МЕТОДЫ СОХРАНЯЮТ nextPage
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
  nextPage: string | null;
  isLoadingMore: boolean;

  loadRecipes: () => Promise<void>;
  searchRecipes: (query: string) => Promise<void>;
  applyFilters: (filters: RecipeFilters) => Promise<void>;
  clearFilters: () => void;
  loadTags: () => Promise<void>;
  getPopularTags: () => Tag[];
  getRecipeById: (id: string) => Promise<Recipe>;
  loadNextPage: () => Promise<void>;
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
  nextPage: null,
  isLoadingMore: false,

  loadRecipes: async () => {
    const { isListLoading } = get();
    if (isListLoading) return;

    set({ isListLoading: true, error: null });
    try {
      const response = await recipeService.getAll();
      set({
        recipes: response.data.results,
        filteredRecipes: response.data.results,
        nextPage: response.data.next,
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
        nextPage: response.data.next,
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
        nextPage: response.data.next, // ВАЖНО: сохраняем nextPage
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
      filters: {},
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
      throw new Error(errorMessage);
    }
  },

  loadNextPage: async () => {
    const { nextPage, isLoadingMore } = get();
    if (!nextPage || isLoadingMore) return;

    set({ isLoadingMore: true, error: null });
    try {
      const response = await recipeService.getByUrl(nextPage);
      set(state => ({
        filteredRecipes: [...state.filteredRecipes, ...response.data.results],
        nextPage: response.data.next,
        isLoadingMore: false
      }));
    } catch (error: any) {
      set({
        error: 'Ошибка загрузки дополнительных рецептов',
        isLoadingMore: false
      });
    }
  },
}));