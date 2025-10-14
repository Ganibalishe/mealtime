import axios from 'axios';
import type {
  Recipe,
  MealPlan,
  ShoppingList,
  Ingredient,
  PaginatedResponse,
  Tag
} from '../types';



const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Функция для обновления токена
const refreshAuthToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await api.post('/auth/token/refresh/', {
      refresh: refreshToken
    });

    const newAccessToken = response.data.access;
    localStorage.setItem('accessToken', newAccessToken);

    return newAccessToken;
  } catch (error) {
    // Если refresh не удался, очищаем оба токена
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    throw error;
  }
};

// Интерцептор для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Интерцептор для обработки ошибок и обновления токена
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ИСКЛЮЧАЕМ запросы аутентификации из логики обновления токена
    const isAuthRequest = originalRequest.url?.includes('/auth/token/');

    // Если ошибка 401, это не запрос аутентификации, и мы еще не повторяли запрос
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAuthToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Если обновление токена не удалось, очищаем токены но НЕ перенаправляем
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.dispatchEvent(new Event('authChange'));
        return Promise.reject(refreshError);
      }
    }

    // Для запросов аутентификации или других ошибок - просто отклоняем промис
    return Promise.reject(error);
  }
);

export const recipeService = {
  getAll: () => api.get<PaginatedResponse<Recipe>>('/recipes/'),
  getById: (id: string) => api.get<Recipe>(`/recipes/${id}/`),

  // ИСПРАВЛЕННЫЙ МЕТОД: правильная отправка массива тегов
  search: (params: {
    q?: string;
    cooking_method?: string;
    difficulty?: string;
    max_time?: number;
    tags?: string[];
  }) => {
    // Создаем URLSearchParams для правильной обработки массива
    const searchParams = new URLSearchParams();

    if (params.q) searchParams.append('q', params.q);
    if (params.cooking_method) searchParams.append('cooking_method', params.cooking_method);
    if (params.difficulty) searchParams.append('difficulty', params.difficulty);
    if (params.max_time) searchParams.append('max_time', params.max_time.toString());

    // Правильно добавляем массив тегов (каждый тег отдельным параметром)
    if (params.tags && params.tags.length > 0) {
      params.tags.forEach(tagId => {
        searchParams.append('tags', tagId);
      });
    }

    return api.get<PaginatedResponse<Recipe>>(`/recipes/search/?${searchParams.toString()}`);
  },

  getFilters: () => api.get('/recipes/filters/'),

  // Обработка пагинированного ответа для тегов
  getTags: () => api.get<PaginatedResponse<Tag>>('/tags/').then(response => ({
    ...response,
    data: response.data.results // возвращаем только массив тегов
  })),
  getPopularTags: () => api.get<PaginatedResponse<Tag>>('/tags/popular/').then(response => ({
    ...response,
    data: response.data.results // возвращаем только массив тегов
  })),
};

export const mealPlanService = {
  getAll: () => api.get<PaginatedResponse<MealPlan>>('/meal-plans/'),
  getByRange: (startDate: string, endDate: string) =>
    api.get<MealPlan[]>(`/meal-plans/range/?start=${startDate}&end=${endDate}`),
  create: (data: { date: string; meal_type: string }) =>
    api.post<MealPlan>('/meal-plans/', data),
  addRecipe: (mealPlanId: string, recipeId: string, portions: number = 2) =>
  api.post(`/meal-plans/${mealPlanId}/add_recipe/`, { recipe_id: recipeId, portions }),
  addRecipeToDate: async (date: string, mealType: string, recipeId: string, portions: number = 2) => {
    // Сначала получаем все планы за диапазон дат (одна дата)
    const existingPlansResponse = await api.get<MealPlan[]>(`/meal-plans/range/?start=${date}&end=${date}`);
    const existingPlans = existingPlansResponse.data;

    // Ищем существующий план с нужным типом приема пищи
    const existingPlan = existingPlans.find(plan =>
      plan.date === date && plan.meal_type === mealType
    );

    if (existingPlan) {
      // Если план существует, добавляем рецепт в него
      return api.post(`/meal-plans/${existingPlan.id}/add_recipe/`, {
        recipe_id: recipeId,
        portions
      });
    } else {
      // Если плана нет, создаем новый и добавляем рецепт
      const createResponse = await api.post<MealPlan>('/meal-plans/', {
        date,
        meal_type: mealType
      });
      const mealPlanId = createResponse.data.id;

      return api.post(`/meal-plans/${mealPlanId}/add_recipe/`, {
        recipe_id: recipeId,
        portions
      });
    }
  },
  removeRecipe: (mealPlanId: string, recipeMealPlanId: string) =>
  api.delete(`/meal-plans/${mealPlanId}/remove_recipe/`, {
    data: { recipe_meal_plan_id: recipeMealPlanId }
  }),
};

export const shoppingListService = {
  getAll: () => api.get<PaginatedResponse<ShoppingList>>('/shopping-lists/'),
  getById: (id: string) => api.get<ShoppingList>(`/shopping-lists/${id}/`),
  generate: (data: { start_date: string; end_date: string; name?: string }) =>
    api.post<ShoppingList>('/shopping-lists/generate/', data),
  getHistory: (days: number = 30) =>
    api.get(`/shopping-lists/history/?days=${days}`),
  complete: (id: string) => api.post(`/shopping-lists/${id}/complete/`),
  duplicate: (id: string) => api.post(`/shopping-lists/${id}/duplicate/`),
  toggleItem: (itemId: string) => api.post(`/shopping-list-items/${itemId}/toggle/`),
};

export const ingredientService = {
  getAll: () => api.get<PaginatedResponse<Ingredient>>('/ingredients/'),
  search: (query: string) =>
    api.get<PaginatedResponse<Ingredient>>('/ingredients/', {
      params: { search: query }
    }),
};

export const authService = {
  login: async (username: string, password: string) => {
    console.log('📤 Отправка запроса на аутентификацию...');
    const response = await api.post('/auth/token/', {
      username,
      password,
    });
    return response;
  },

  register: async (userData: { username: string; email: string; password: string }) => {
    const response = await api.post('/auth/register/', userData);
    return response;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

export default api;