# management/commands/load_recipes.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import (
    Ingredient, CookingMethod, Tag, Recipe, RecipeIngredient
)

class Command(BaseCommand):
    help = 'Load recipes from JSON file into database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Path to JSON file with recipes',
            default='breakfast_recipes.json'
        )

    def load_existing_data(self):
        """Загружает все существующие данные в словари для быстрого поиска"""
        self.stdout.write("Loading existing data...")

        # Загружаем ингредиенты
        self.ingredients_map = {}
        for ingredient in Ingredient.objects.all():
            self.ingredients_map[ingredient.name] = ingredient
            self.ingredients_map[ingredient.name.lower()] = ingredient

        # Загружаем способы приготовления
        self.cooking_methods_map = {}
        for method in CookingMethod.objects.all():
            self.cooking_methods_map[method.name] = method
            self.cooking_methods_map[method.name.lower()] = method

        # Загружаем теги
        self.tags_map = {}
        for tag in Tag.objects.all():
            self.tags_map[tag.name] = tag
            self.tags_map[tag.name.lower()] = tag

        self.stdout.write(
            f"Loaded: {len(self.ingredients_map)} ingredients, "
            f"{len(self.cooking_methods_map)} cooking methods, "
            f"{len(self.tags_map)} tags"
        )

    def get_or_create_tag(self, tag_name):
        """Получает или создает тег"""
        # Ищем в разных вариантах написания
        tag = (self.tags_map.get(tag_name) or
              self.tags_map.get(tag_name.lower()))

        if not tag:
            # Создаем новый тег с цветом по умолчанию
            default_color = "#8a837a"  # neutral-500
            tag = Tag.objects.create(
                name=tag_name,
                color=default_color
            )
            # Добавляем в кэш
            self.tags_map[tag_name] = tag
            self.tags_map[tag_name.lower()] = tag
            self.stdout.write(f'Created new tag: {tag_name}')

        return tag

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
        # Получаем способ приготовления
        cooking_method_name = recipe_data["cooking_method"]
        cooking_method = self.cooking_methods_map.get(cooking_method_name)

        if not cooking_method:
            self.stdout.write(
                self.style.ERROR(f'Cooking method "{cooking_method_name}" not found for recipe {recipe_data["name"]}')
            )
            return

        # Создаем рецепт
        recipe = Recipe.objects.create(
            name=recipe_data["name"],
            description=recipe_data["description"],
            cooking_time=recipe_data["cooking_time"],
            difficulty=recipe_data["difficulty"],
            cooking_method=cooking_method,
            instructions=recipe_data["instructions"],
            portions=recipe_data["portions"]
        )

        # Добавляем теги (создаем новые если нужно)
        for tag_name in recipe_data["tags"]:
            tag = self.get_or_create_tag(tag_name)
            recipe.tags.add(tag)

        # Добавляем ингредиенты
        for ing_data in recipe_data["ingredients"]:
            ingredient_name = ing_data["name"]
            ingredient = self.ingredients_map.get(ingredient_name)

            if not ingredient:
                self.stdout.write(
                    self.style.ERROR(f'Ingredient "{ingredient_name}" not found for recipe {recipe.name}')
                )
                continue

            try:
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    ingredient=ingredient,
                    quantity=ing_data["quantity"]
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error adding ingredient {ingredient_name} to {recipe.name}: {str(e)}')
                )

        self.stdout.write(f'✅ Created recipe: {recipe.name}')
        return recipe