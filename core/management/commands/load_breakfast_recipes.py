# management/commands/load_breakfast_recipes.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import (
    Ingredient, IngredientCategory, CookingMethod,
    Tag, Recipe, RecipeIngredient
)

class Command(BaseCommand):
    help = 'Load breakfast recipes from JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='breakfast_recipes.json',
            help='JSON file with recipes data'
        )

    def handle(self, *args, **options):
        file_path = options['file']

        # 1. Load all existing data into memory
        self.stdout.write('Loading existing data...')

        # Categories dictionary
        categories = {cat.name: cat for cat in IngredientCategory.objects.all()}

        # Ingredients dictionary
        existing_ingredients = {ing.name: ing for ing in Ingredient.objects.all()}

        # Cooking methods dictionary
        cooking_methods = {method.name: method for method in CookingMethod.objects.all()}

        # Tags dictionary
        tags = {tag.name: tag for tag in Tag.objects.all()}

        # Default color for new tags (using existing tag color)
        DEFAULT_TAG_COLOR = '#8a837a'

        # 2. Read JSON file
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                recipes_data = json.load(f)
        except FileNotFoundError:
            self.stderr.write(f'Error: File {file_path} not found')
            return
        except json.JSONDecodeError as e:
            self.stderr.write(f'Error decoding JSON: {e}')
            return

        self.stdout.write(f'Found {len(recipes_data)} recipes to process')

        # 3. Process each recipe
        success_count = 0
        error_count = 0

        for recipe_data in recipes_data:
            try:
                with transaction.atomic():
                    self._process_recipe(
                        recipe_data,
                        existing_ingredients,
                        categories,
                        cooking_methods,
                        tags,
                        DEFAULT_TAG_COLOR
                    )
                success_count += 1
                self.stdout.write(f'✓ Created: {recipe_data["name"]}')

            except Exception as e:
                error_count += 1
                self.stderr.write(f'✗ Error with {recipe_data["name"]}: {str(e)}')
                continue

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully processed {success_count} recipes. '
                f'Errors: {error_count}'
            )
        )

    def _process_recipe(self, recipe_data, existing_ingredients, categories,
                       cooking_methods, tags, default_tag_color):
        """Process a single recipe"""

        # Find or create cooking method
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

        # Process tags - используем ManyToMany связь
        recipe_tags = []
        for tag_name in recipe_data['tags']:
            tag = tags.get(tag_name)
            if not tag:
                tag = Tag.objects.create(
                    name=tag_name,
                    color=default_tag_color
                )
                tags[tag_name] = tag
            recipe_tags.append(tag)

        # Добавляем теги через ManyToMany связь
        recipe.tags.set(recipe_tags)

        # Process ingredients
        for ing_data in recipe_data['ingredients']:
            ingredient_name = ing_data['name']
            quantity = ing_data['quantity']

            # Find existing ingredient or create new
            ingredient = existing_ingredients.get(ingredient_name)

            if not ingredient:
                # Create new ingredient with appropriate category and unit
                category, unit = self._determine_category_and_unit(ingredient_name, categories)
                ingredient = Ingredient.objects.create(
                    name=ingredient_name,
                    category=category,
                    default_unit=unit
                )
                existing_ingredients[ingredient_name] = ingredient

            # Create recipe ingredient relationship
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ingredient,
                quantity=quantity
            )

    def _determine_category_and_unit(self, ingredient_name, categories):
        """Determine category and unit for new ingredient based on its name"""

        # Default category and unit
        category = categories['Прочее']
        unit = 'g'

        # Vegetable detection
        vegetable_keywords = ['карто', 'морков', 'капус', 'свекл', 'помидор', 'лук',
                             'чеснок', 'перец', 'броккол', 'цветная', 'тыква',
                             'кабачок', 'баклажан', 'редис', 'редиска', 'сельдерей',
                             'спаржа', 'огурец', 'шпинат', 'руккола', 'салат']

        # Fruit detection
        fruit_keywords = ['яблок', 'апельсин', 'лимон', 'банан', 'груш', 'персик',
                         'черри', 'малина', 'клубника', 'черника', 'изюм']

        # Meat detection
        meat_keywords = ['курин', 'говядин', 'свинин', 'индейк', 'баран', 'телятин',
                        'фарш', 'стейк', 'отбивн', 'бекон', 'ветчин', 'лосось']

        # Fish detection
        fish_keywords = ['лосос', 'форель', 'треск', 'окун', 'щук', 'карп', 'креветк',
                        'миди', 'кальмар', 'икра']

        # Dairy detection
        dairy_keywords = ['молок', 'сливк', 'сметан', 'творог', 'йогурт', 'кефир',
                         'моцарелла', 'фета', 'сыр']

        # Spices detection
        spice_keywords = ['соль', 'перец', 'лавров', 'мускат', 'кориц', 'ванил',
                         'паприка', 'тимьян', 'розмарин', 'орегано', 'зира']

        # Grains detection
        grain_keywords = ['рис', 'гречк', 'овсян', 'манн', 'перлов', 'пшен', 'лапша',
                         'макарон', 'фетучини', 'спагетти', 'хлеб', 'батон', 'тортиль']

        ingredient_lower = ingredient_name.lower()

        # Determine category and unit
        if any(keyword in ingredient_lower for keyword in vegetable_keywords):
            category = categories['Овощи и зелень']
            unit = 'kg' if any(word in ingredient_lower for word in ['карто', 'морков', 'капус', 'свекл', 'тыква']) else 'g'

        elif any(keyword in ingredient_lower for keyword in fruit_keywords):
            category = categories['Фрукты и ягоды']
            unit = 'kg' if any(word in ingredient_lower for word in ['яблок', 'апельсин', 'лимон', 'банан', 'груш']) else 'g'

        elif any(keyword in ingredient_lower for keyword in meat_keywords):
            category = categories['Мясо и птица']
            unit = 'g'

        elif any(keyword in ingredient_lower for keyword in fish_keywords):
            category = categories['Рыба и морепродукты']
            unit = 'g'

        elif any(keyword in ingredient_lower for keyword in dairy_keywords):
            category = categories['Молочные продукты']
            unit = 'g' if any(word in ingredient_lower for word in ['творог', 'сметан', 'йогурт', 'сыр']) else 'ml'

        elif any(keyword in ingredient_lower for keyword in spice_keywords):
            category = categories['Специи и травы']
            unit = 'pinch' if any(word in ingredient_lower for word in ['соль', 'перец', 'лавров']) else 'g'

        elif any(keyword in ingredient_lower for keyword in grain_keywords):
            category = categories['Крупы и макароны']
            unit = 'g'

        elif 'масл' in ingredient_lower:
            category = categories['Масла и жиры']
            unit = 'ml' if 'растительн' in ingredient_lower or 'оливков' in ingredient_lower else 'g'

        elif 'яйц' in ingredient_lower:
            category = categories['Яйца']
            unit = 'pcs'

        elif 'орех' in ingredient_lower or 'семечк' in ingredient_lower or 'миндал' in ingredient_lower:
            category = categories['Орехи и сухофрукты']
            unit = 'g'

        elif 'сироп' in ingredient_lower or 'мед' in ingredient_lower:
            category = categories['Сладости']
            unit = 'ml' if 'сироп' in ingredient_lower else 'g'

        elif 'шоколад' in ingredient_lower:
            category = categories['Сладости']
            unit = 'g'

        elif 'разрыхлитель' in ingredient_lower:
            category = categories['Мука и смеси']
            unit = 'g'

        elif 'семена' in ingredient_lower or 'чиа' in ingredient_lower:
            category = categories['Орехи и сухофрукты']
            unit = 'g'

        elif 'кокосов' in ingredient_lower:
            category = categories['Орехи и сухофрукты']
            unit = 'g'

        return category, unit