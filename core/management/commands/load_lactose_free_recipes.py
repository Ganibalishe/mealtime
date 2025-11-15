# management/commands/load_lactose_free_recipes.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import (
    Ingredient, IngredientCategory, CookingMethod, Tag, Recipe, RecipeIngredient
)

class Command(BaseCommand):
    help = 'Load lactose-free recipes from JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='lactose_free_recipes.json',
            help='JSON file with recipes data'
        )

    def handle(self, *args, **options):
        file_path = options['file']

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                recipes_data = json.load(f)
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f'File {file_path} not found')
            )
            return
        except json.JSONDecodeError as e:
            self.stdout.write(
                self.style.ERROR(f'Invalid JSON file: {e}')
            )
            return

        # Load existing data
        existing_ingredients = {ing.name.lower(): ing for ing in Ingredient.objects.all()}
        cooking_methods = {method.name: method for method in CookingMethod.objects.all()}
        tags = {tag.name: tag for tag in Tag.objects.all()}
        categories = {cat.name: cat for cat in IngredientCategory.objects.all()}

        # Ensure 'Прочее' category exists
        if 'Прочее' not in categories:
            other_category = IngredientCategory.objects.create(
                name='Прочее',
                order=99
            )
            categories['Прочее'] = other_category
            self.stdout.write(
                self.style.SUCCESS('Created category: Прочее')
            )

        # Create missing tags if needed
        if 'Безлактозное' not in tags:
            lactose_free_tag = Tag.objects.create(
                name='Безлактозное',
                color='#4CAF50',
                description='Безлактозные рецепты для людей с непереносимостью лактозы'
            )
            tags['Безлактозное'] = lactose_free_tag
            self.stdout.write(
                self.style.SUCCESS('Created tag: Безлактозное')
            )

        created_count = 0
        error_count = 0

        with transaction.atomic():
            for recipe_data in recipes_data:
                try:
                    self.create_recipe(
                        recipe_data,
                        existing_ingredients,
                        cooking_methods,
                        tags,
                        categories
                    )
                    created_count += 1
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f'Error creating recipe {recipe_data.get("name", "Unknown")}: {e}')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} recipes. Errors: {error_count}'
            )
        )

    def create_recipe(self, recipe_data, existing_ingredients, cooking_methods, tags, categories):
        # Get or create cooking method
        cooking_method_name = recipe_data['cooking_method']
        cooking_method = cooking_methods.get(cooking_method_name)
        if not cooking_method:
            cooking_method = CookingMethod.objects.create(name=cooking_method_name)
            cooking_methods[cooking_method_name] = cooking_method

        # Create recipe
        recipe = Recipe.objects.create(
            name=recipe_data['name'],
            description=recipe_data['description'],
            cooking_time=recipe_data['cooking_time'],
            difficulty=recipe_data['difficulty'],
            cooking_method=cooking_method,
            instructions=recipe_data['instructions'],
            portions=recipe_data['portions']
        )

        # Add tags
        tag_objects = []
        for tag_name in recipe_data['tags']:
            if tag_name in tags:
                tag_objects.append(tags[tag_name])
            else:
                # Create new tag with default color
                new_tag = Tag.objects.create(
                    name=tag_name,
                    color='#808080',
                    description=f'Автоматически созданный тег для {tag_name}'
                )
                tags[tag_name] = new_tag
                tag_objects.append(new_tag)

        recipe.tags.set(tag_objects)

        # Create recipe ingredients
        for ing_data in recipe_data['ingredients']:
            ingredient_name = ing_data['name']
            quantity = ing_data['quantity']

            # Find or create ingredient
            ingredient = self.get_or_create_ingredient(
                ingredient_name, existing_ingredients, categories
            )

            # Create RecipeIngredient
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ingredient,
                quantity=quantity
            )

    def get_or_create_ingredient(self, name, existing_ingredients, categories):
        name_lower = name.lower()

        if name_lower in existing_ingredients:
            return existing_ingredients[name_lower]

        # Create new ingredient
        category, unit = self.determine_category_and_unit(name, categories)

        new_ingredient = Ingredient.objects.create(
            name=name,
            category=category,
            default_unit=unit
        )

        existing_ingredients[name_lower] = new_ingredient
        self.stdout.write(
            self.style.WARNING(f'Created new ingredient: {name} ({unit})')
        )

        return new_ingredient

    def determine_category_and_unit(self, name, categories):
        """Determine category and unit for new ingredient"""
        name_lower = name.lower()

        # Category mapping
        category_mapping = {
            'овощ': 'Овощи и зелень',
            'фрукт': 'Фрукты и ягоды',
            'мясо': 'Мясо и птица',
            'куриц': 'Мясо и птица',
            'индейк': 'Мясо и птица',
            'рыба': 'Рыба и морепродукты',
            'морепродукт': 'Рыба и морепродукты',
            'минтай': 'Рыба и морепродукты',
            'хек': 'Рыба и морепродукты',
            'печень': 'Мясо и птица',
            'фарш': 'Мясо и птица',
            'хлеб': 'Хлеб и выпечка',
            'творог': 'Молочные продукты',
            'круп': 'Крупы и макароны',
            'рис': 'Крупы и макароны',
            'гречк': 'Крупы и макароны',
            'овсян': 'Крупы и макароны',
            'перлов': 'Крупы и макароны',
            'вермишель': 'Крупы и макароны',
            'лапша': 'Крупы и макароны',
            'мука': 'Мука и смеси',
            'масло': 'Масла и жиры',
            'орех': 'Орехи и судофрукты',
            'изюм': 'Орехи и судофрукты',
            'миндаль': 'Орехи и судофрукты',
            'специ': 'Специи и травы',
            'соль': 'Специи и травы',
            'перец': 'Специи и травы',
            'кориц': 'Специи и травы',
            'уксус': 'Соусы и приправы',
            'мед': 'Сладости',
            'сахар': 'Сладости',
            'пюре': 'Фрукты и ягоды',
            'вода': 'Напитки'
        }

        # Unit mapping
        unit_mapping = {
            'овощ': 'kg',
            'фрукт': 'kg',
            'мясо': 'g',
            'куриц': 'g',
            'индейк': 'g',
            'рыба': 'g',
            'морепродукт': 'g',
            'печень': 'g',
            'фарш': 'g',
            'хлеб': 'g',
            'творог': 'g',
            'круп': 'g',
            'рис': 'g',
            'гречк': 'g',
            'овсян': 'g',
            'перлов': 'g',
            'вермишель': 'g',
            'лапша': 'g',
            'мука': 'g',
            'масло': 'ml',
            'орех': 'g',
            'изюм': 'g',
            'миндаль': 'g',
            'специ': 'g',
            'соль': 'g',
            'перец': 'g',
            'кориц': 'g',
            'уксус': 'ml',
            'мед': 'g',
            'сахар': 'g',
            'пюре': 'g',
            'вода': 'ml'
        }

        # Find matching category and unit
        category_obj = categories.get('Прочее')
        unit = 'g'  # default unit

        for key, cat_name in category_mapping.items():
            if key in name_lower:
                category_obj = categories.get(cat_name, categories.get('Прочее'))
                unit = unit_mapping.get(key, 'g')
                break

        return category_obj, unit