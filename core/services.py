from django.utils import timezone
from datetime import timedelta
from .models import MealPlan, RecipeMealPlan, PremiumMealPlan, UserPurchase


def activate_premium_menu_for_user(user, premium_meal_plan):
    """
    Активирует премиум меню для пользователя (создает запись о покупке)
    """
    purchase, created = UserPurchase.objects.get_or_create(
        user=user,
        premium_meal_plan=premium_meal_plan,
        defaults={
            'price_paid': premium_meal_plan.price if not premium_meal_plan.is_free else None
        }
    )
    return purchase, created


def create_meal_plan_from_premium(user, premium_meal_plan, start_date):
    """
    Создает план питания из премиум меню начиная с указанной даты
    """
    created_plans = []

    # Проходим по всем рецептам в премиум меню
    for premium_recipe in premium_meal_plan.premium_recipes.all().select_related('recipe'):
        # Вычисляем дату для этого рецепта
        recipe_date = start_date + timedelta(days=premium_recipe.day_number - 1)

        # Создаем или получаем план питания на эту дату и прием пищи
        meal_plan, created = MealPlan.objects.get_or_create(
            user=user,
            date=recipe_date,
            meal_type=premium_recipe.meal_type,
            defaults={}
        )

        # Создаем связь рецепта с планом питания
        recipe_meal_plan = RecipeMealPlan.objects.create(
            meal_plan=meal_plan,
            recipe=premium_recipe.recipe,
            portions=premium_recipe.recipe.portions,  # Используем порции из рецепта
            order=premium_recipe.order
        )

        created_plans.append(meal_plan)

    return created_plans