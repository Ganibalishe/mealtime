from django.db.models import Sum
from collections import defaultdict
from .models import MealPlan, RecipeIngredient, ShoppingList, ShoppingListItem


def generate_shopping_list(user, start_date, end_date, list_name=None):
    """
    Генерирует список покупок на основе планов питания за указанный период
    """
    # 1. Получаем все планы питания пользователя за период
    meal_plans = MealPlan.objects.filter(
        user=user, date__gte=start_date, date__lte=end_date
    ).prefetch_related("recipes__recipe__ingredients__ingredient")

    if not meal_plans:
        return None, "Нет планов питания за указанный период"

    # 2. Агрегируем ингредиенты
    ingredient_totals = defaultdict(lambda: {"quantity": 0, "recipes": set()})

    for meal_plan in meal_plans:
        for recipe_meal_plan in meal_plan.recipes.all():
            recipe = recipe_meal_plan.recipe
            portions_factor = (
                recipe_meal_plan.portions / recipe.portions
            )  # Коэффициент для порций

            # Проходим по всем ингредиентам рецепта
            for recipe_ingredient in recipe.ingredients.all():
                ingredient = recipe_ingredient.ingredient
                total_quantity = float(recipe_ingredient.quantity) * portions_factor

                # Добавляем в агрегацию
                ingredient_totals[ingredient.id]["ingredient"] = ingredient
                ingredient_totals[ingredient.id]["quantity"] += total_quantity
                ingredient_totals[ingredient.id]["recipes"].add(recipe.name)
                ingredient_totals[ingredient.id]["unit"] = ingredient.default_unit

    # 3. Преобразуем в удобный формат
    aggregated_ingredients = []
    for ingredient_id, data in ingredient_totals.items():
        aggregated_ingredients.append(
            {
                "ingredient": data["ingredient"],
                "quantity": round(data["quantity"], 2),
                "unit": data["unit"],
                "recipes": list(data["recipes"]),
                "category": data["ingredient"].category,
            }
        )

    # 4. Сортируем по категориям
    aggregated_ingredients.sort(
        key=lambda x: (
            x["category"].order if x["category"] else 999,
            x["ingredient"].name,
        )
    )

    return aggregated_ingredients, meal_plans


def create_shopping_list_from_aggregation(
    user, aggregated_ingredients, meal_plans, list_name=None
):
    """
    Создает ShoppingList и ShoppingListItem из агрегированных данных
    """
    if not aggregated_ingredients:
        return None

    # Создаем список покупок
    if not list_name:
        list_name = (
            f"Покупки {meal_plans[0].date} - {meal_plans[len(meal_plans)-1].date}"
        )

    shopping_list = ShoppingList.objects.create(
        user=user,
        name=list_name,
        period_start=meal_plans[0].date,
        period_end=meal_plans[len(meal_plans) - 1].date,
    )

    # Связываем с планами питания
    shopping_list.base_meal_plans.set(meal_plans)

    # Создаем элементы списка
    for order, agg_data in enumerate(aggregated_ingredients):
        ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            ingredient=agg_data["ingredient"],
            quantity=agg_data["quantity"],
            unit=agg_data["unit"],  # Сохраняем unit для гибкости
            category=agg_data["category"],
            order=order,
        )

    # Обновляем счетчики
    shopping_list.save()

    return shopping_list
