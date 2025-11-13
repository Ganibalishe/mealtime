# management/commands/load_workweek_recipes.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import (
    Ingredient, IngredientCategory, CookingMethod, Tag,
    Recipe, RecipeIngredient
)


class Command(BaseCommand):
    help = 'Загрузка рецептов для рабочей недели из JSON файла'

    def add_arguments(self, parser):
        parser.add_argument(
            'json_file',
            type=str,
            help='Путь к JSON файлу с рецептами'
        )

    def handle(self, *args, **options):
        json_file_path = options['json_file']

        if not os.path.exists(json_file_path):
            self.stdout.write(
                self.style.ERROR(f'Файл {json_file_path} не найден')
            )
            return

        # Загрузка существующих данных
        existing_data = self.load_existing_data()

        # Чтение JSON файла
        with open(json_file_path, 'r', encoding='utf-8') as file:
            recipes_data = json.load(file)

        # Создание рецептов
        self.create_recipes(recipes_data, existing_data)

    def load_existing_data(self):
        """Загрузка всех существующих данных из базы"""
        self.stdout.write('Загрузка существующих данных...')

        existing_data = {
            'ingredients': {},
            'categories': {},
            'cooking_methods': {},
            'tags': {}
        }

        # Ингредиенты
        for ingredient in Ingredient.objects.all():
            existing_data['ingredients'][ingredient.name.lower()] = ingredient

        # Категории
        for category in IngredientCategory.objects.all():
            existing_data['categories'][category.name.lower()] = category

        # Способы приготовления
        for method in CookingMethod.objects.all():
            existing_data['cooking_methods'][method.name.lower()] = method

        # Теги
        for tag in Tag.objects.all():
            existing_data['tags'][tag.name.lower()] = tag

        self.stdout.write(
            self.style.SUCCESS(
                f'Загружено: {len(existing_data["ingredients"])} ингредиентов, '
                f'{len(existing_data["cooking_methods"])} способов приготовления, '
                f'{len(existing_data["tags"])} тегов'
            )
        )

        return existing_data

    def get_or_create_ingredient(self, ingredient_name, existing_data):
        """Найти или создать ингредиент"""
        ingredient_name_lower = ingredient_name.lower()

        if ingredient_name_lower in existing_data['ingredients']:
            return existing_data['ingredients'][ingredient_name_lower]

        # Создание нового ингредиента
        self.stdout.write(f'Создание нового ингредиента: {ingredient_name}')

        # Определяем категорию и единицу измерения по логике
        category, unit = self.determine_category_and_unit(ingredient_name)

        ingredient = Ingredient.objects.create(
            name=ingredient_name,
            category=category,
            default_unit=unit
        )

        existing_data['ingredients'][ingredient_name_lower] = ingredient
        return ingredient

    def determine_category_and_unit(self, ingredient_name):
        """Определить категорию и единицу измерения для нового ингредиента"""
        ingredient_lower = ingredient_name.lower()

        # Овощи
        if any(word in ingredient_lower for word in ['помидор', 'огурец', 'брокколи', 'салат', 'лук', 'морковь', 'картофель', 'авокадо']):
            category = IngredientCategory.objects.get(name="Овощи и зелень")
            unit = 'kg' if any(word in ingredient_lower for word in ['картофель', 'морковь', 'лук']) else 'g'
        # Фрукты/ягоды
        elif any(word in ingredient_lower for word in ['лимон', 'банан', 'клубника', 'малина', 'ягоды']):
            category = IngredientCategory.objects.get(name="Фрукты и ягоды")
            unit = 'kg' if any(word in ingredient_lower for word in ['банан', 'лимон']) else 'g'
        # Мясо/птица
        elif any(word in ingredient_lower for word in ['куриная', 'говядина']):
            category = IngredientCategory.objects.get(name="Мясо и птица")
            unit = 'g'
        # Рыба
        elif any(word in ingredient_lower for word in ['лосось', 'креветки']):
            category = IngredientCategory.objects.get(name="Рыба и морепродукты")
            unit = 'g'
        # Молочные продукты
        elif any(word in ingredient_lower for word in ['молоко', 'творог', 'йогурт', 'сметана', 'сливки', 'сыр']):
            category = IngredientCategory.objects.get(name="Молочные продукты")
            unit = 'g' if any(word in ingredient_lower for word in ['творог', 'йогурт', 'сметана', 'сыр']) else 'ml'
        # Крупы
        elif any(word in ingredient_lower for word in ['овсяные', 'гречка', 'рис', 'спагетти']):
            category = IngredientCategory.objects.get(name="Крупы и макароны")
            unit = 'g'
        # Орехи/семена
        elif any(word in ingredient_lower for word in ['орехи', 'миндаль', 'семена']):
            category = IngredientCategory.objects.get(name="Орехи и сухофрукты")
            unit = 'g'
        # Сладости
        elif any(word in ingredient_lower for word in ['мед', 'сахар']):
            category = IngredientCategory.objects.get(name="Сладости")
            unit = 'g'
        # Соусы/приправы
        elif any(word in ingredient_lower for word in ['соус', 'горчица', 'уксус']):
            category = IngredientCategory.objects.get(name="Соусы и приправы")
            unit = 'ml' if any(word in ingredient_lower for word in ['уксус', 'соус']) else 'g'
        # Специи
        elif any(word in ingredient_lower for word in ['соль', 'перец', 'лавровый', 'чеснок', 'имбирь']):
            category = IngredientCategory.objects.get(name="Специи и травы")
            unit = 'g'
        # Масла
        elif any(word in ingredient_lower for word in ['масло']):
            category = IngredientCategory.objects.get(name="Масла и жиры")
            unit = 'ml' if any(word in ingredient_lower for word in ['оливковое', 'растительное']) else 'g'
        # Хлеб
        elif any(word in ingredient_lower for word in ['хлеб']):
            category = IngredientCategory.objects.get(name="Хлеб и выпечка")
            unit = 'pcs'
        # Напитки
        elif any(word in ingredient_lower for word in ['вино']):
            category = IngredientCategory.objects.get(name="Напитки")
            unit = 'ml'
        # По умолчанию
        else:
            category = IngredientCategory.objects.get(name="Прочее")
            unit = 'g'

        return category, unit

    def get_or_create_cooking_method(self, method_name, existing_data):
        """Найти или создать способ приготовления"""
        method_name_lower = method_name.lower()

        if method_name_lower in existing_data['cooking_methods']:
            return existing_data['cooking_methods'][method_name_lower]

        # Создание нового способа приготовления
        self.stdout.write(f'Создание нового способа приготовления: {method_name}')

        method = CookingMethod.objects.create(name=method_name)
        existing_data['cooking_methods'][method_name_lower] = method
        return method

    def get_or_create_tag(self, tag_name, existing_data):
        """Найти или создать тег"""
        tag_name_lower = tag_name.lower()

        if tag_name_lower in existing_data['tags']:
            return existing_data['tags'][tag_name_lower]

        # Создание нового тега
        self.stdout.write(f'Создание нового тега: {tag_name}')

        # Цвета по умолчанию для разных типов тегов
        color_mapping = {
            'завтрак': '#996240',
            'ужин': '#a7552d',
            'быстро': '#b5c9ac',
            'легкое': '#7A8C6D',
            'полезно': '#4c5944',
            'сытно': '#8a837a',
            'семейный': '#a7552d',
            'ресторанное': '#3f4839',
            'сладкое': '#8a837a',
            'просто': '#5f7054',
            'диетическое': '#e0d9d0',
            'овощное': '#a7552d'
        }

        color = '#808080'  # цвет по умолчанию
        for key, value in color_mapping.items():
            if key in tag_name_lower:
                color = value
                break

        tag = Tag.objects.create(
            name=tag_name,
            color=color,
            description=f"Автоматически созданный тег для {tag_name}"
        )
        existing_data['tags'][tag_name_lower] = tag
        return tag

    def create_recipes(self, recipes_data, existing_data):
        """Создание рецептов из JSON данных"""
        self.stdout.write(f'Начинаю создание {len(recipes_data)} рецептов...')

        created_count = 0
        error_count = 0

        for recipe_data in recipes_data:
            try:
                with transaction.atomic():
                    self.create_single_recipe(recipe_data, existing_data)
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Создан рецепт: {recipe_data["name"]}')
                )

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'Ошибка при создании рецепта {recipe_data["name"]}: {str(e)}'
                    )
                )
                continue

        self.stdout.write(
            self.style.SUCCESS(
                f'Загрузка завершена! Успешно: {created_count}, Ошибок: {error_count}'
            )
        )

    def create_single_recipe(self, recipe_data, existing_data):
        """Создание одного рецепта"""
        # Получение или создание способа приготовления
        cooking_method = self.get_or_create_cooking_method(
            recipe_data['cooking_method'],
            existing_data
        )

        # Создание рецепта
        recipe = Recipe.objects.create(
            name=recipe_data['name'],
            description=recipe_data['description'],
            cooking_time=recipe_data['cooking_time'],
            difficulty=recipe_data['difficulty'],
            cooking_method=cooking_method,
            instructions=recipe_data['instructions'],
            portions=recipe_data['portions'],
            is_premium=False
        )

        # Добавление тегов
        for tag_name in recipe_data['tags']:
            tag = self.get_or_create_tag(tag_name, existing_data)
            recipe.tags.add(tag)

        # Добавление ингредиентов
        for ingredient_data in recipe_data['ingredients']:
            ingredient = self.get_or_create_ingredient(
                ingredient_data['name'],
                existing_data
            )

            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ingredient,
                quantity=ingredient_data['quantity']
            )

        return recipe