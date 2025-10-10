import os
import django
from datetime import date, timedelta
import random

# Настройка окружения Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mealtime_backend.settings")
django.setup()

from django.contrib.auth.models import User
from core.models import (
    IngredientCategory,
    CookingMethod,
    Ingredient,
    Recipe,
    RecipeIngredient,
    MealPlan,
    RecipeMealPlan,
    ShoppingList,
    ShoppingListItem,
    ShoppingListTemplate,
    TemplateItem,
)


def create_test_data():
    print("🔄 Начинаем создание тестовых данных...")

    # 1. Создаем тестового пользователя
    user, created = User.objects.get_or_create(
        username="testuser",
        defaults={
            "email": "test@example.com",
            "first_name": "Тестовый",
            "last_name": "Пользователь",
        },
    )
    if created:
        user.set_password("testpassword123")
        user.save()
        print("✅ Создан тестовый пользователь")
    else:
        print("⚠️ Тестовый пользователь уже существует")

    # 2. Создаем категории ингредиентов
    categories_data = [
        {"name": "Овощи", "order": 1},
        {"name": "Фрукты", "order": 2},
        {"name": "Молочные продукты", "order": 3},
        {"name": "Мясо и птица", "order": 4},
        {"name": "Рыба и морепродукты", "order": 5},
        {"name": "Крупы и макароны", "order": 6},
        {"name": "Специи и приправы", "order": 7},
        {"name": "Мука и выпечка", "order": 8},
        {"name": "Напитки", "order": 9},
        {"name": "Прочее", "order": 10},
    ]

    categories = {}
    for cat_data in categories_data:
        category, created = IngredientCategory.objects.get_or_create(
            name=cat_data["name"], defaults={"order": cat_data["order"]}
        )
        categories[cat_data["name"]] = category
        if created:
            print(f"✅ Создана категория: {cat_data['name']}")

    # 3. Создаем способы приготовления
    cooking_methods_data = [
        "Варка",
        "Жарка",
        "Тушение",
        "Запекание",
        "Гриль",
        "На пару",
        "Сыроедение",
    ]

    cooking_methods = {}
    for method_name in cooking_methods_data:
        method, created = CookingMethod.objects.get_or_create(name=method_name)
        cooking_methods[method_name] = method
        if created:
            print(f"✅ Создан способ приготовления: {method_name}")

    # 4. Создаем ингредиенты
    ingredients_data = [
        # Овощи
        {"name": "Картофель", "category": "Овощи", "unit": "pcs"},
        {"name": "Морковь", "category": "Овощи", "unit": "pcs"},
        {"name": "Лук репчатый", "category": "Овощи", "unit": "pcs"},
        {"name": "Помидоры", "category": "Овощи", "unit": "pcs"},
        {"name": "Огурцы", "category": "Овощи", "unit": "pcs"},
        {"name": "Капуста белокочанная", "category": "Овощи", "unit": "pcs"},
        {"name": "Чеснок", "category": "Овощи", "unit": "pcs"},
        {"name": "Перец болгарский", "category": "Овощи", "unit": "pcs"},
        # Фрукты
        {"name": "Яблоки", "category": "Фрукты", "unit": "pcs"},
        {"name": "Бананы", "category": "Фрукты", "unit": "pcs"},
        {"name": "Апельсины", "category": "Фрукты", "unit": "pcs"},
        # Молочные продукты
        {"name": "Молоко", "category": "Молочные продукты", "unit": "ml"},
        {"name": "Сметана", "category": "Молочные продукты", "unit": "g"},
        {"name": "Сыр", "category": "Молочные продукты", "unit": "g"},
        {"name": "Творог", "category": "Молочные продукты", "unit": "g"},
        {"name": "Йогурт", "category": "Молочные продукты", "unit": "g"},
        # Мясо и птица
        {"name": "Куриное филе", "category": "Мясо и птица", "unit": "g"},
        {"name": "Говядина", "category": "Мясо и птица", "unit": "g"},
        {"name": "Свинина", "category": "Мясо и птица", "unit": "g"},
        {"name": "Фарш мясной", "category": "Мясо и птица", "unit": "g"},
        # Крупы и макароны
        {"name": "Рис", "category": "Крупы и макароны", "unit": "g"},
        {"name": "Гречка", "category": "Крупы и макароны", "unit": "g"},
        {"name": "Макароны", "category": "Крупы и макароны", "unit": "g"},
        {"name": "Овсяные хлопья", "category": "Крупы и макароны", "unit": "g"},
        # Специи и приправы
        {"name": "Соль", "category": "Специи и приправы", "unit": "tsp"},
        {"name": "Перец черный", "category": "Специи и приправы", "unit": "tsp"},
        {"name": "Лавровый лист", "category": "Специи и приправы", "unit": "pcs"},
        {"name": "Сахар", "category": "Специи и приправы", "unit": "g"},
        # Мука и выпечка
        {"name": "Мука пшеничная", "category": "Мука и выпечка", "unit": "g"},
        {"name": "Яйца", "category": "Мука и выпечка", "unit": "pcs"},
        {"name": "Дрожжи", "category": "Мука и выпечка", "unit": "g"},
        # Напитки
        {"name": "Чай", "category": "Напитки", "unit": "tsp"},
        {"name": "Кофе", "category": "Напитки", "unit": "g"},
    ]

    ingredients = {}
    for ing_data in ingredients_data:
        ingredient, created = Ingredient.objects.get_or_create(
            name=ing_data["name"],
            defaults={
                "category": categories[ing_data["category"]],
                "default_unit": ing_data["unit"],
            },
        )
        ingredients[ing_data["name"]] = ingredient
        if created:
            print(f"✅ Создан ингредиент: {ing_data['name']}")

    # 5. Создаем рецепты
    recipes_data = [
        {
            "name": "Омлет с овощами",
            "description": "Питательный завтрак с свежими овощами",
            "cooking_time": 15,
            "difficulty": "easy",
            "cooking_method": "Жарка",
            "instructions": "1. Нарезать овощи\n2. Взбить яйца\n3. Обжарить овощи\n4. Залить яйцами и жарить до готовности",
            "portions": 2,
            "ingredients": [
                {"name": "Яйца", "quantity": 4, "unit": "pcs"},
                {"name": "Помидоры", "quantity": 2, "unit": "pcs"},
                {"name": "Перец болгарский", "quantity": 1, "unit": "pcs"},
                {"name": "Лук репчатый", "quantity": 0.5, "unit": "pcs"},
                {"name": "Соль", "quantity": 1, "unit": "tsp"},
                {"name": "Молоко", "quantity": 50, "unit": "ml"},
            ],
        },
        {
            "name": "Куриный суп с лапшой",
            "description": "Ароматный суп с курицей и овощами",
            "cooking_time": 45,
            "difficulty": "medium",
            "cooking_method": "Варка",
            "instructions": "1. Сварить куриный бульон\n2. Добавить овощи\n3. Добавить лапшу\n4. Варить до готовности",
            "portions": 4,
            "ingredients": [
                {"name": "Куриное филе", "quantity": 300, "unit": "g"},
                {"name": "Картофель", "quantity": 3, "unit": "pcs"},
                {"name": "Морковь", "quantity": 1, "unit": "pcs"},
                {"name": "Лук репчатый", "quantity": 1, "unit": "pcs"},
                {"name": "Макароны", "quantity": 100, "unit": "g"},
                {"name": "Соль", "quantity": 2, "unit": "tsp"},
                {"name": "Лавровый лист", "quantity": 2, "unit": "pcs"},
            ],
        },
        {
            "name": "Гречневая каша с грибами",
            "description": "Питательный гарнир с грибами и луком",
            "cooking_time": 30,
            "difficulty": "easy",
            "cooking_method": "Тушение",
            "instructions": "1. Обжарить грибы с луком\n2. Добавить гречку\n3. Залить водой и тушить до готовности",
            "portions": 3,
            "ingredients": [
                {"name": "Гречка", "quantity": 200, "unit": "g"},
                {"name": "Лук репчатый", "quantity": 1, "unit": "pcs"},
                {"name": "Чеснок", "quantity": 2, "unit": "pcs"},
                {"name": "Соль", "quantity": 1, "unit": "tsp"},
                {"name": "Масло растительное", "quantity": 30, "unit": "ml"},
            ],
        },
        {
            "name": "Салат из свежих овощей",
            "description": "Легкий и полезный салат",
            "cooking_time": 10,
            "difficulty": "easy",
            "cooking_method": "Сыроедение",
            "instructions": "1. Нарезать все овощи\n2. Заправить маслом и специями\n3. Перемешать",
            "portions": 2,
            "ingredients": [
                {"name": "Помидоры", "quantity": 2, "unit": "pcs"},
                {"name": "Огурцы", "quantity": 2, "unit": "pcs"},
                {"name": "Перец болгарский", "quantity": 1, "unit": "pcs"},
                {"name": "Лук репчатый", "quantity": 0.5, "unit": "pcs"},
                {"name": "Соль", "quantity": 1, "unit": "tsp"},
                {"name": "Масло растительное", "quantity": 20, "unit": "ml"},
            ],
        },
        {
            "name": "Запеченная курица с картофелем",
            "description": "Сочная курица с хрустящим картофелем",
            "cooking_time": 60,
            "difficulty": "medium",
            "cooking_method": "Запекание",
            "instructions": "1. Натереть курицу специями\n2. Выложить на противень с картофелем\n3. Запекать в духовке 45-60 минут",
            "portions": 4,
            "ingredients": [
                {"name": "Куриное филе", "quantity": 500, "unit": "g"},
                {"name": "Картофель", "quantity": 6, "unit": "pcs"},
                {"name": "Лук репчатый", "quantity": 2, "unit": "pcs"},
                {"name": "Чеснок", "quantity": 4, "unit": "pcs"},
                {"name": "Соль", "quantity": 2, "unit": "tsp"},
                {"name": "Перец черный", "quantity": 1, "unit": "tsp"},
            ],
        },
    ]

    recipes = {}
    for recipe_data in recipes_data:
        recipe, created = Recipe.objects.get_or_create(
            name=recipe_data["name"],
            defaults={
                "description": recipe_data["description"],
                "cooking_time": recipe_data["cooking_time"],
                "difficulty": recipe_data["difficulty"],
                "cooking_method": cooking_methods[recipe_data["cooking_method"]],
                "instructions": recipe_data["instructions"],
                "portions": recipe_data["portions"],
            },
        )
        recipes[recipe_data["name"]] = recipe

        if created:
            # Добавляем ингредиенты к рецепту
            for ing_data in recipe_data["ingredients"]:
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    ingredient=ingredients[ing_data["name"]],
                    quantity=ing_data["quantity"],
                )
            print(f"✅ Создан рецепт: {recipe_data['name']}")

    # 6. Создаем планы питания на текущую неделю
    print("🔄 Создаем планы питания...")

    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())  # Понедельник

    meal_types = ["breakfast", "lunch", "dinner"]
    meal_names = {"breakfast": "Завтрак", "lunch": "Обед", "dinner": "Ужин"}

    # Рецепты для разных приемов пищи
    breakfast_recipes = [recipes["Омлет с овощами"]]
    lunch_recipes = [
        recipes["Куриный суп с лапшой"],
        recipes["Гречневая каша с грибами"],
    ]
    dinner_recipes = [
        recipes["Салат из свежих овощей"],
        recipes["Запеченная курица с картофелем"],
    ]

    for day in range(7):  # На всю неделю
        current_date = start_of_week + timedelta(days=day)

        for meal_type in meal_types:
            # Создаем план питания на прием пищи
            meal_plan, created = MealPlan.objects.get_or_create(
                user=user, date=current_date, meal_type=meal_type, defaults={}
            )

            if created:
                # Выбираем случайный рецепт для этого приема пищи
                if meal_type == "breakfast":
                    recipe_choice = random.choice(breakfast_recipes)
                elif meal_type == "lunch":
                    recipe_choice = random.choice(lunch_recipes)
                else:  # dinner
                    recipe_choice = random.choice(dinner_recipes)

                # Добавляем рецепт в план
                RecipeMealPlan.objects.create(
                    meal_plan=meal_plan,
                    recipe=recipe_choice,
                    portions=random.randint(2, 4),
                    order=1,
                )

                print(
                    f"✅ Создан план: {current_date} - {meal_names[meal_type]} - {recipe_choice.name}"
                )

    # 7. Создаем тестовый список покупок
    print("🔄 Создаем списки покупок...")

    # Список на текущую неделю
    shopping_list, created = ShoppingList.objects.get_or_create(
        user=user,
        period_start=start_of_week,
        period_end=start_of_week + timedelta(days=6),
        defaults={"name": f"Покупки на неделю {start_of_week}"},
    )

    if created:
        # Добавляем некоторые ингредиенты в список
        sample_ingredients = [
            ("Картофель", 10, "pcs"),
            ("Морковь", 5, "pcs"),
            ("Лук репчатый", 3, "pcs"),
            ("Куриное филе", 500, "g"),
            ("Молоко", 1000, "ml"),
            ("Яйца", 10, "pcs"),
            ("Сыр", 200, "g"),
        ]

        for i, (ing_name, quantity, unit) in enumerate(sample_ingredients):
            ShoppingListItem.objects.create(
                shopping_list=shopping_list,
                ingredient=ingredients[ing_name],
                quantity=quantity,
                unit=unit,
                category=ingredients[ing_name].category,
                order=i,
            )

        print(f"✅ Создан список покупок: {shopping_list.name}")

    # 8. Создаем шаблон списка покупок
    template, created = ShoppingListTemplate.objects.get_or_create(
        user=user,
        name="Базовые продукты",
        defaults={"description": "Еженедельные основные покупки", "is_default": True},
    )

    if created:
        template_items = [
            ("Хлеб", 1, "pcs"),
            ("Молоко", 1000, "ml"),
            ("Яйца", 10, "pcs"),
            ("Сыр", 200, "g"),
            ("Масло растительное", 500, "ml"),
            ("Соль", 1, "pcs"),
        ]

        for i, (ing_name, quantity, unit) in enumerate(template_items):
            # Если ингредиента нет в базе, создаем его в категории "Прочее"
            if ing_name not in ingredients:
                ingredient = Ingredient.objects.create(
                    name=ing_name, category=categories["Прочее"], default_unit=unit
                )
                ingredients[ing_name] = ingredient

            TemplateItem.objects.create(
                template=template,
                ingredient=ingredients[ing_name],
                quantity=quantity,
                unit=unit,
                order=i,
            )

        print(f"✅ Создан шаблон списка: {template.name}")

    print("\n🎉 Тестовые данные успешно созданы!")
    print("\n📊 Статистика:")
    print(f"   Пользователей: {User.objects.count()}")
    print(f"   Категорий: {IngredientCategory.objects.count()}")
    print(f"   Ингредиентов: {Ingredient.objects.count()}")
    print(f"   Рецептов: {Recipe.objects.count()}")
    print(f"   Планов питания: {MealPlan.objects.count()}")
    print(f"   Списков покупок: {ShoppingList.objects.count()}")
    print(f"   Шаблонов: {ShoppingListTemplate.objects.count()}")

    print("\n🔑 Данные для входа:")
    print(f"   Логин: testuser")
    print(f"   Пароль: testpassword123")
    print(f"   API: http://127.0.0.1:8000/api/")
    print(f"   Админка: http://127.0.0.1:8000/admin/")


if __name__ == "__main__":
    create_test_data()
