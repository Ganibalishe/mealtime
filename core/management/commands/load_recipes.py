import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction, models
from core.models import (
    IngredientCategory, CookingMethod, Ingredient, Tag,
    Recipe, RecipeIngredient
)

class Command(BaseCommand):
    help = 'Load recipes from JSON file into database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Path to JSON file with recipes',
            default='recipes_data.json'
        )

    def normalize_name(self, name):
        """Приводит название к формату с заглавной буквы"""
        if not name:
            return name
        return name.strip().capitalize()

    def load_existing_data(self):
        """Загружает все существующие данные в словари для быстрого поиска"""
        self.stdout.write("Loading existing data...")

        # Загружаем категории ингредиентов
        self.existing_categories = {}
        for category in IngredientCategory.objects.all():
            self.existing_categories[category.name] = category
            self.existing_categories[category.name.lower()] = category

        # Загружаем способы приготовления
        self.existing_cooking_methods = {}
        for method in CookingMethod.objects.all():
            self.existing_cooking_methods[method.name] = method
            self.existing_cooking_methods[method.name.lower()] = method

        # Загружаем теги
        self.existing_tags = {}
        for tag in Tag.objects.all():
            self.existing_tags[tag.name] = tag
            self.existing_tags[tag.name.lower()] = tag

        # Загружаем ингредиенты
        self.existing_ingredients = {}
        for ingredient in Ingredient.objects.all():
            self.existing_ingredients[ingredient.name] = ingredient
            self.existing_ingredients[ingredient.name.lower()] = ingredient

        self.stdout.write(
            f"Loaded: {len(self.existing_categories)} categories, "
            f"{len(self.existing_cooking_methods)} cooking methods, "
            f"{len(self.existing_tags)} tags, "
            f"{len(self.existing_ingredients)} ingredients"
        )

    def get_or_create_category(self, category_name):
        """Получает или создает категорию ингредиентов"""
        normalized_name = self.normalize_name(category_name)

        # Ищем в разных вариантах написания
        category = (self.existing_categories.get(normalized_name) or
                   self.existing_categories.get(category_name.lower()))

        if not category:
            # Создаем новую категорию
            max_order = IngredientCategory.objects.aggregate(models.Max('order'))['order__max'] or 0
            category = IngredientCategory.objects.create(
                name=normalized_name,
                order=max_order + 1
            )
            # Добавляем в кэш
            self.existing_categories[normalized_name] = category
            self.existing_categories[category_name.lower()] = category
            self.stdout.write(f'Created new category: {normalized_name}')

        return category

    def get_or_create_cooking_method(self, method_name):
        """Получает или создает способ приготовления"""
        normalized_name = self.normalize_name(method_name)

        # Ищем в разных вариантах написания
        method = (self.existing_cooking_methods.get(normalized_name) or
                 self.existing_cooking_methods.get(method_name.lower()))

        if not method:
            # Создаем новый способ приготовления
            method = CookingMethod.objects.create(name=normalized_name)
            # Добавляем в кэш
            self.existing_cooking_methods[normalized_name] = method
            self.existing_cooking_methods[method_name.lower()] = method
            self.stdout.write(f'Created new cooking method: {normalized_name}')

        return method

    def get_or_create_tag(self, tag_name):
        """Получает или создает тег"""
        normalized_name = self.normalize_name(tag_name)

        # Ищем в разных вариантах написания
        tag = (self.existing_tags.get(normalized_name) or
              self.existing_tags.get(tag_name.lower()))

        if not tag:
            # Создаем новый тег с цветом по умолчанию
            default_color = "#8a837a"  # neutral-500
            tag = Tag.objects.create(
                name=normalized_name,
                color=default_color
            )
            # Добавляем в кэш
            self.existing_tags[normalized_name] = tag
            self.existing_tags[tag_name.lower()] = tag
            self.stdout.write(f'Created new tag: {normalized_name}')

        return tag

    def get_or_create_ingredient(self, ingredient_name):
        """Получает или создает ингредиент"""
        normalized_name = self.normalize_name(ingredient_name)

        # Ищем в разных вариантах написания
        ingredient = (self.existing_ingredients.get(normalized_name) or
                     self.existing_ingredients.get(ingredient_name.lower()))

        if not ingredient:
            # Определяем категорию по умолчанию
            default_category = self.get_or_create_category("Прочее")

            # Определяем единицу измерения по умолчанию на основе названия
            default_unit = self.determine_default_unit(ingredient_name)

            # Создаем новый ингредиент
            ingredient = Ingredient.objects.create(
                name=normalized_name,
                category=default_category,
                default_unit=default_unit
            )
            # Добавляем в кэш
            self.existing_ingredients[normalized_name] = ingredient
            self.existing_ingredients[ingredient_name.lower()] = ingredient
            self.stdout.write(f'Created new ingredient: {normalized_name}')

        return ingredient

    def determine_default_unit(self, ingredient_name):
        """Определяет единицу измерения по умолчанию на основе названия ингредиента"""
        name_lower = ingredient_name.lower()

        # Жидкости
        if any(word in name_lower for word in ['масло', 'молоко', 'вода', 'сок', 'соус', 'уксус']):
            return "ml"
        # Сыпучие продукты
        elif any(word in name_lower for word in ['мука', 'сахар', 'рис', 'греч', 'крупа', 'макароны', 'соль']):
            return "g"
        # Овощи/фрукты, которые обычно продаются поштучно
        elif any(word in name_lower for word in ['яйц', 'лук', 'помидор', 'огурец', 'яблоко', 'банан', 'лимон']):
            return "pcs"
        # Овощи/фрукты, которые обычно продаются на вес
        elif any(word in name_lower for word in ['карто', 'капуст', 'морковь', 'свекла']):
            return "kg"
        # Специи
        elif any(word in name_lower for word in ['перец', 'соль', 'специи', 'травы']):
            return "pinch"
        else:
            return "pcs"  # по умолчанию штуки

    def ensure_basic_categories(self):
        """Создает базовые категории, если их нет"""
        basic_categories = [
            "Овощи", "Фрукты и ягоды", "Молочные продукты", "Мясо и птица",
            "Рыба и морепродукты", "Яйца", "Крупы и макароны", "Хлеб и выпечка",
            "Специи и приправы", "Соусы", "Напитки", "Орехи и сухофрукты",
            "Масла и жиры", "Сладости", "Прочее"
        ]

        for i, category_name in enumerate(basic_categories, 1):
            self.get_or_create_category(category_name)

    def ensure_basic_cooking_methods(self):
        """Создает базовые способы приготовления, если их нет"""
        basic_methods = [
            "Варка", "Жарка", "Запекание", "Тушение", "Гриль",
            "Пароварка", "Микроволновка", "Сыроедение", "Копчение"
        ]

        for method_name in basic_methods:
            self.get_or_create_cooking_method(method_name)

    def ensure_basic_tags(self):
        """Создает базовые теги, если их нет"""
        basic_tags = [
            {"name": "Завтрак", "color": "#9CAF88"},
            {"name": "Обед", "color": "#CC6B49"},
            {"name": "Ужин", "color": "#c78f5a"},
            {"name": "Быстро", "color": "#8a837a"},
            {"name": "Полезно", "color": "#22c55e"},
            {"name": "Праздничный", "color": "#ca6b33"},
            {"name": "Семейный", "color": "#7A8C6D"},
            {"name": "Вегетарианское", "color": "#16a34a"},
            {"name": "Десерт", "color": "#D4A574"},
            {"name": "Суп", "color": "#b5c9ac"},
            {"name": "Салат", "color": "#d4e0cd"},
            {"name": "Гарнир", "color": "#b8b0a6"},
            {"name": "Выпечка", "color": "#e3936e"},
            {"name": "Классика", "color": "#5f7054"},
            {"name": "Новый год", "color": "#a7552d"},
            {"name": "Сытно", "color": "#4c5944"},
        ]

        for tag_data in basic_tags:
            normalized_name = self.normalize_name(tag_data["name"])
            tag = self.existing_tags.get(normalized_name)
            if not tag:
                tag = Tag.objects.create(
                    name=normalized_name,
                    color=tag_data["color"]
                )
                self.existing_tags[normalized_name] = tag
                self.existing_tags[tag_data["name"].lower()] = tag
                self.stdout.write(f'Created basic tag: {normalized_name}')

    @transaction.atomic
    def handle(self, *args, **options):
        file_path = options['file']

        if not os.path.exists(file_path):
            self.stdout.write(
                self.style.ERROR(f'File {file_path} not found!')
            )
            return

        # Загружаем существующие данные
        self.load_existing_data()

        # Обеспечиваем наличие базовых данных
        self.ensure_basic_categories()
        self.ensure_basic_cooking_methods()
        self.ensure_basic_tags()

        # Читаем JSON с рецептами
        with open(file_path, 'r', encoding='utf-8') as f:
            recipes_data = json.load(f)

        # Создаем рецепты
        created_count = 0
        for recipe_data in recipes_data:
            try:
                self.create_recipe(recipe_data)
                created_count += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating recipe {recipe_data["name"]}: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} recipes')
        )

    def create_recipe(self, recipe_data):
        """Создает один рецепт со всеми связями"""
        # Получаем или создаем способ приготовления
        cooking_method = self.get_or_create_cooking_method(recipe_data["cooking_method"])

        # Создаем рецепт
        recipe = Recipe.objects.create(
            name=recipe_data["name"],
            description=recipe_data.get("description", ""),
            cooking_time=recipe_data["cooking_time"],
            difficulty=recipe_data["difficulty"],
            cooking_method=cooking_method,
            instructions=recipe_data["instructions"],
            portions=recipe_data["portions"]
        )

        # Добавляем теги
        for tag_name in recipe_data["tags"]:
            tag = self.get_or_create_tag(tag_name)
            recipe.tags.add(tag)

        # Добавляем ингредиенты
        for ing_data in recipe_data["ingredients"]:
            ingredient = self.get_or_create_ingredient(ing_data["name"])

            try:
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    ingredient=ingredient,
                    quantity=ing_data["quantity"]
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error adding ingredient {ing_data["name"]} to {recipe.name}: {str(e)}')
                )

        self.stdout.write(f'Created recipe: {recipe.name}')
        return recipe