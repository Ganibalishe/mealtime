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
    recipes_count: number;
    created_at: string;
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

  export interface PremiumMenuFilters {
    q?: string;
    tags?: string[];
    is_free?: boolean;
    duration_min?: number;
    duration_max?: number;
  }