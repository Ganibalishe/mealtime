import os
import django
from datetime import date, timedelta
import random

# Настройка окружения Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mealtime_backend.settings")
django.setup()

from django.contrib.auth.models import User
from core.models import (
    Ingredient,
    Recipe,
    RecipeIngredient,
    MealPlan,
    RecipeMealPlan,
    IngredientCategory,
    CookingMethod,
)


def create_test_plans_with_overlapping_ingredients():
    print("🔄 Создаем тестовые данные с пересекающимися ингредиентами...")

    # 1. Получаем тестового пользователя
    try:
        user = User.objects.get(username="testuser")
        print("✅ Найден тестовый пользователь")
    except User.DoesNotExist:
        print("❌ Тестовый пользователь не найден. Сначала запустите fill_test_data.py")
        return

    # 2. Получаем существующие ингредиенты
    ingredients = {ing.name: ing for ing in Ingredient.objects.all()}
    print(f"✅ Найдено ингредиентов: {len(ingredients)}")

    # 3. Создаем новые рецепты с пересекающимися ингредиентами
    new_recipes_data = [
        {
            "name": "Картофель запеченный с сыром",
            "description": "Простое и вкусное блюдо из картофеля",
            "cooking_time": 40,
            "difficulty": "easy",
            "cooking_method": "Запекание",
            "instructions": "1. Нарезать картофель\n2. Посыпать сыром\n3. Запекать 40 минут",
            "portions": 4,
            "ingredients": [
                {"name": "Картофель", "quantity": 8, "unit": "pcs"},
                {"name": "Сыр", "quantity": 200, "unit": "g"},
                {"name": "Соль", "quantity": 1, "unit": "tsp"},
                {"name": "Чеснок", "quantity": 3, "unit": "pcs"},
            ],
        },
        {
            "name": "Куриный салат с овощами",
            "description": "Сытный салат с курицей и свежими овощами",
            "cooking_time": 25,
            "difficulty": "easy",
            "cooking_method": "Сыроедение",
            "instructions": "1. Отварить курицу\n2. Нарезать овощи\n3. Смешать все ингредиенты",
            "portions": 3,
            "ingredients": [
                {"name": "Куриное филе", "quantity": 300, "unit": "g"},
                {"name": "Помидоры", "quantity": 3, "unit": "pcs"},
                {"name": "Огурцы", "quantity": 2, "unit": "pcs"},
                {"name": "Лук репчатый", "quantity": 1, "unit": "pcs"},
                {"name": "Соль", "quantity": 1, "unit": "tsp"},
            ],
        },
        {
            "name": "Овощной суп с курицей",
            "description": "Легкий суп с курицей и сезонными овощами",
            "cooking_time": 35,
            "difficulty": "medium",
            "cooking_method": "Варка",
            "instructions": "1. Сварить куриный бульон\n2. Добавить овощи\n3. Варить до готовности",
            "portions": 4,
            "ingredients": [
                {"name": "Куриное филе", "quantity": 400, "unit": "g"},
                {"name": "Картофель", "quantity": 4, "unit": "pcs"},
                {"name": "Морковь", "quantity": 2, "unit": "pcs"},
                {"name": "Лук репчатый", "quantity": 1, "unit": "pcs"},
                {"name": "Соль", "quantity": 2, "unit": "tsp"},
            ],
        },
        {
            "name": "Яичница с помидорами и луком",
            "description": "Классический завтрак",
            "cooking_time": 10,
            "difficulty": "easy",
            "cooking_method": "Жарка",
            "instructions": "1. Обжарить лук и помидоры\n2. Влить яйца\n3. Жарить до готовности",
            "portions": 2,
            "ingredients": [
                {"name": "Яйца", "quantity": 4, "unit": "pcs"},
                {"name": "Помидоры", "quantity": 2, "unit": "pcs"},
                {"name": "Лук репчатый", "quantity": 0.5, "unit": "pcs"},
                {"name": "Соль", "quantity": 1, "unit": "tsp"},
            ],
        },
    ]

    # Получаем способ приготовления "Запекание"
    baking_method, _ = CookingMethod.objects.get_or_create(name="Запекание")

    new_recipes = {}
    for recipe_data in new_recipes_data:
        # Проверяем, существует ли рецепт
        recipe, created = Recipe.objects.get_or_create(
            name=recipe_data["name"],
            defaults={
                "description": recipe_data["description"],
                "cooking_time": recipe_data["cooking_time"],
                "difficulty": recipe_data["difficulty"],
                "cooking_method": baking_method,  # Используем запекание как дефолт
                "instructions": recipe_data["instructions"],
                "portions": recipe_data["portions"],
            },
        )

        new_recipes[recipe_data["name"]] = recipe

        if created:
            # Добавляем ингредиенты к рецепту
            for ing_data in recipe_data["ingredients"]:
                if ing_data["name"] in ingredients:
                    RecipeIngredient.objects.create(
                        recipe=recipe,
                        ingredient=ingredients[ing_data["name"]],
                        quantity=ing_data["quantity"],
                    )
            print(f"✅ Создан рецепт: {recipe_data['name']}")
        else:
            print(f"⚠️ Рецепт уже существует: {recipe_data['name']}")

    # 4. Создаем планы питания на ближайшие 4 дня
    print("\n🔄 Создаем планы питания на 4 дня...")

    # Используем завтрашний день как начало
    start_date = date.today() + timedelta(days=1)

    # Распределение рецептов по приемам пищи
    meal_assignments = {
        "breakfast": ["Омлет с овощами", "Яичница с помидорами и луком"],
        "lunch": [
            "Куриный суп с лапшой",
            "Овощной суп с курицей",
            "Гречневая каша с грибами",
        ],
        "dinner": [
            "Салат из свежих овощей",
            "Куриный салат с овощами",
            "Картофель запеченный с сыром",
            "Запеченная курица с картофелем",
        ],
    }

    created_plans = []

    for day in range(4):  # На 4 дня
        current_date = start_date + timedelta(days=day)

        for meal_type, available_recipes in meal_assignments.items():
            # Выбираем случайный рецепт из доступных для этого приема пищи
            # Фильтруем только те рецепты, которые существуют в нашей базе
            existing_recipes = [
                r
                for r in available_recipes
                if r in new_recipes
                or r
                in Recipe.objects.filter(name__in=available_recipes).values_list(
                    "name", flat=True
                )
            ]

            if not existing_recipes:
                print(f"⚠️ Нет доступных рецептов для {meal_type}")
                continue

            recipe_name = random.choice(existing_recipes)

            # Находим рецепт в базе
            try:
                recipe = Recipe.objects.get(name=recipe_name)
            except Recipe.DoesNotExist:
                print(f"⚠️ Рецепт не найден: {recipe_name}")
                continue

            # Создаем план питания
            meal_plan, created = MealPlan.objects.get_or_create(
                user=user, date=current_date, meal_type=meal_type
            )

            if created:
                # Добавляем рецепт в план
                RecipeMealPlan.objects.create(
                    meal_plan=meal_plan,
                    recipe=recipe,
                    portions=random.randint(2, 4),
                    order=1,
                )

                created_plans.append(
                    {
                        "date": current_date,
                        "meal_type": meal_type,
                        "recipe": recipe.name,
                    }
                )

                print(f"✅ Создан план: {current_date} - {meal_type} - {recipe.name}")

    # 5. Выводим информацию для тестирования
    print("\n📊 Информация для тестирования:")
    print(f"📅 Период для генерации списка покупок:")
    print(f"   Начало: {start_date}")
    print(f"   Конец: {start_date + timedelta(days=3)}")
    print(f"   Всего планов создано: {len(created_plans)}")

    # Анализируем пересечения ингредиентов
    print("\n🔍 Анализ пересечений ингредиентов:")

    # Собираем все ингредиенты из созданных планов
    all_ingredients = {}
    for plan_info in created_plans:
        meal_plan = MealPlan.objects.get(
            user=user, date=plan_info["date"], meal_type=plan_info["meal_type"]
        )

        for recipe_plan in meal_plan.recipes.all():
            recipe = recipe_plan.recipe
            for ingredient in recipe.ingredients.all():
                ing_name = ingredient.ingredient.name
                if ing_name not in all_ingredients:
                    all_ingredients[ing_name] = {
                        "quantity": 0,
                        "recipes": set(),
                        "unit": ingredient.ingredient.default_unit,
                    }

                # Учитываем порции
                portions_factor = recipe_plan.portions / recipe.portions
                all_ingredients[ing_name]["quantity"] += (
                    float(ingredient.quantity) * portions_factor
                )
                all_ingredients[ing_name]["recipes"].add(recipe.name)

    print("📋 Ожидаемый агрегированный список покупок:")
    for ing_name, data in sorted(all_ingredients.items()):
        print(
            f"   {ing_name}: {data['quantity']} {data['unit']} (в рецептах: {', '.join(data['recipes'])})"
        )

    print("\n🔗 Пример curl запроса для тестирования:")
    print(f"curl -X POST http://127.0.0.1:8000/api/shopping-lists/generate/ \\")
    print(f'  -H "Authorization: Bearer YOUR_TOKEN" \\')
    print(f'  -H "Content-Type: application/json" \\')
    print(
        f'  -d \'{{"start_date": "{start_date}", "end_date": "{start_date + timedelta(days=3)}"}}\''
    )

    print(
        "\n🎉 Тестовые данные созданы! Теперь можно проверить генерацию списка покупок."
    )


if __name__ == "__main__":
    create_test_plans_with_overlapping_ingredients()
