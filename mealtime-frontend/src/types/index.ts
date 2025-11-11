export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  }

  export interface IngredientCategory {
    id: string;
    name: string;
    order: number;
  }

  export interface CookingMethod {
    id: string;
    name: string;
  }

  export interface Ingredient {
    id: string;
    name: string;
    category: string;
    category_name?: string;
    default_unit: string;
    default_unit_display?: string;
  }

  export interface RecipeIngredient {
    id: string;
    ingredient: string;
    ingredient_name: string;
    quantity: number;
    unit: string;
    unit_display: string;
  }

  export interface Tag {
    id: string;
    name: string;
    color: string;
    description?: string;
  }

  export interface Recipe {
    id: string;
    name: string;
    description?: string;
    cooking_time?: number;
    difficulty: string;
    difficulty_display: string;
    cooking_method?: string;
    cooking_method_name?: string;
    instructions: string;
    image?: string;
    portions: number;
    ingredients: RecipeIngredient[];
    tags: Tag[];
  }

  export interface RecipeMealPlan {
    id: string;
    recipe: string;
    recipe_name: string;
    recipe_cooking_time?: number;
    portions: number;
    order: number;
  }

  export interface MealPlan {
    id: string;
    user: number;
    date: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'supper';
    meal_type_display: string;
    recipes: RecipeMealPlan[];
  }

  export interface ShoppingListItem {
    id: string;
    ingredient: string;
    ingredient_name: string;
    quantity: number;
    unit: string;
    unit_display: string;
    checked: boolean;
    category?: string;
    category_name?: string;
    custom_name: string;
    notes: string;
    order: number;
  }

  export interface ShoppingList {
    id: string;
    user: number;
    name: string;
    period_start: string;
    period_end: string;
    status: 'draft' | 'active' | 'completed' | 'archived';
    total_items: number;
    items_checked: number;
    progress: number;
    is_outdated: boolean;
    created_at: string;
    updated_at: string;
    items: ShoppingListItem[];
  }

  export interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
  }

  export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
  }

  export interface RecipeFilters {
    cooking_method?: string;
    difficulty?: string;
    max_cooking_time?: number;
    search?: string;
    q?: string;
    tags?: string[];
    max_time?: number;
  }

  export interface PremiumMenuState {
    menus: PremiumMealPlan[];
    filteredMenus: PremiumMealPlan[];
    currentMenu: PremiumMealPlan | null;
    isLoading: boolean;
    error: string | null;
    nextPage: string | null;
    isLoadingMore: boolean;
    isSearchLoading: boolean;
    currentMenuLoading: boolean;
    currentMenuError: string | null;
    purchases: UserPurchase[]; // НОВОЕ ПОЛЕ
  }

  export interface PremiumMealPlan {
    id: string;
    name: string;
    description: string;
    price: string | null;
    is_free: boolean;
    duration_days: number;
    is_active: boolean;
    tags: Tag[];
    premium_recipes: PremiumMealPlanRecipe[];
    is_purchased: boolean;
    purchase_status?: 'paid' | 'processing' | 'cancelled' | null; // НОВОЕ ПОЛЕ
    recipes_count: number;
    created_at: string;
    updated_at?: string;
  }

  export interface PremiumMealPlanRecipe {
    id: string;
    day_number: number;
    meal_type: string;
    meal_type_display: string;
    recipe: Recipe;
    recipe_name: string;
    recipe_image: string | null;
    recipe_cooking_time: number;
    order: number;
  }

  export interface UserPurchase {
    id: string;
    user: string;
    premium_meal_plan: string | PremiumMealPlan;
    purchase_date: string;
    price_paid: string | null;
    status: 'paid' | 'processing' | 'cancelled';
    status_display: string;
  }

  export interface PremiumMenuFilters {
    q?: string;
    tags?: string[];
    is_free?: boolean;
    duration_min?: number;
    duration_max?: number;
  }

  // Типы для форм
export interface CreatePlanFormData {
  startDate: string;
  portions: number;
}

// Типы для API ответов активации меню
export interface ActivateMenuResponse {
  message: string;
  purchase: UserPurchase;
  requires_payment: boolean;
  purchase_status: 'paid' | 'processing' | 'cancelled';
}

export interface CreatePlanResponse {
  message: string;
  start_date: string;
  portions: number;
  created_plans_count: number;
  premium_meal_plan: string;
  created_dates?: string[];
}

// Типы для ошибок
export interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

// Типы для платежной системы (заготовка для будущего)
export interface PaymentMethod {
  id: string;
  type: 'card' | 'yoomoney' | 'sbp';
  last4?: string;
  brand?: string;
  is_default: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled';
  client_secret?: string;
  payment_method?: string;
}

// Вспомогательные типы
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type PurchaseStatus = 'paid' | 'processing' | 'cancelled';

// Константы
export const MEAL_TYPES = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
} as const;

export const DIFFICULTY_LEVELS = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно',
} as const;

export const PURCHASE_STATUSES = {
  paid: 'Оплачен',
  processing: 'В обработке',
  cancelled: 'Отказ',
} as const;

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled';
  client_secret?: string;
  payment_method?: string;
}

export interface PaymentResponse {
  success: boolean;
  purchase_id?: string;
  menu_name?: string;
  error?: string;
}

export interface RobokassaPaymentParams {
  MerchantLogin: string;
  OutSum: string;
  InvId: string;
  Description: string;
  Culture: string;
  Encoding: string;
  IsTest: string;
  SignatureValue: string;
  Settings: string; // JSON string
  // Пользовательские параметры
  Shp_user?: string;
  Shp_menu?: string;
  [key: string]: any; // Для дополнительных параметров
}

// Ответ от сервера при создании платежа
export interface CreatePaymentResponse {
  payment_params: RobokassaPaymentParams;
  purchase_id: string;
  menu_name: string;
}