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


def create_meal_plan_from_premium(user, premium_meal_plan, start_date, portions=2):
    """
    Создает план питания из премиум меню начиная с указанной даты
    """
    created_plans = []

    # Преобразуем start_date в datetime.date если это строка
    if isinstance(start_date, str):
        from datetime import datetime
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()

    # Проходим по всем рецептам в премиум меню
    for premium_recipe in premium_meal_plan.premium_recipes.all().select_related('recipe'):
        # Вычисляем дату для этого рецепта
        from datetime import timedelta
        recipe_date = start_date + timedelta(days=premium_recipe.day_number - 1)

        # Создаем или получаем план питания на эту дату и прием пищи
        meal_plan, created = MealPlan.objects.get_or_create(
            user=user,
            date=recipe_date,
            meal_type=premium_recipe.meal_type,
            defaults={}
        )

        # Проверяем, нет ли уже этого рецепта в плане на этот день
        existing_recipe = RecipeMealPlan.objects.filter(
            meal_plan=meal_plan,
            recipe=premium_recipe.recipe
        ).first()

        if not existing_recipe:
            # Создаем связь рецепта с планом питания с указанным количеством порций
            recipe_meal_plan = RecipeMealPlan.objects.create(
                meal_plan=meal_plan,
                recipe=premium_recipe.recipe,
                portions=portions,  # Используем переданное количество порций
                order=premium_recipe.order
            )
            created_plans.append(meal_plan)

    return created_plans