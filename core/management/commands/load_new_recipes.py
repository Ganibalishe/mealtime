import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import (
    Ingredient, IngredientCategory, CookingMethod, Tag,
    Recipe, RecipeIngredient
)

class Command(BaseCommand):
    help = 'Load new premium recipes from JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='ann_recipes.json',
            help='JSON file with recipes data'
        )

    def handle(self, *args, **options):
        file_path = options['file']

        if not os.path.exists(file_path):
            self.stdout.write(
                self.style.ERROR(f'File {file_path} does not exist')
            )
            return

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                recipes_data = json.load(f)
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error reading JSON file: {e}')
            )
            return

        # Load existing data into memory
        ingredients = {ing.name.lower(): ing for ing in Ingredient.objects.all()}
        categories = {cat.name: cat for cat in IngredientCategory.objects.all()}
        cooking_methods = {cm.name.lower(): cm for cm in CookingMethod.objects.all()}
        tags = {tag.name.lower(): tag for tag in Tag.objects.all()}

        created_recipes_count = 0
        created_ingredients_count = 0
        created_tags_count = 0
        created_methods_count = 0
        errors = []

        self.stdout.write(
            self.style.SUCCESS(f'Starting to process {len(recipes_data)} recipes...')
        )

        with transaction.atomic():
            for i, recipe_data in enumerate(recipes_data, 1):
                try:
                    recipe_created, ing_created, tag_created, method_created = self.create_recipe(
                        recipe_data,
                        ingredients,
                        categories,
                        cooking_methods,
                        tags
                    )

                    if recipe_created:
                        created_recipes_count += 1
                    created_ingredients_count += ing_created
                    created_tags_count += tag_created
                    created_methods_count += method_created

                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Processed {i}/{len(recipes_data)}: {recipe_data["name"]}')
                    )

                except Exception as e:
                    error_msg = f"{recipe_data['name']}: {str(e)}"
                    errors.append(error_msg)
                    self.stdout.write(
                        self.style.ERROR(f'❌ Failed {i}/{len(recipes_data)}: {error_msg}')
                    )

        # Summary
        self.stdout.write(
            self.style.SUCCESS('\n' + '='*50)
        )
        self.stdout.write(
            self.style.SUCCESS('📊 LOADING SUMMARY:')
        )
        self.stdout.write(
            self.style.SUCCESS(f'✅ Recipes created: {created_recipes_count}')
        )
        self.stdout.write(
            self.style.SUCCESS(f'✅ New ingredients created: {created_ingredients_count}')
        )
        self.stdout.write(
            self.style.SUCCESS(f'✅ New tags created: {created_tags_count}')
        )
        self.stdout.write(
            self.style.SUCCESS(f'✅ New cooking methods created: {created_methods_count}')
        )

        if errors:
            self.stdout.write(
                self.style.WARNING(f'\n⚠️  Errors occurred ({len(errors)}):')
            )
            for error in errors:
                self.stdout.write(self.style.ERROR(f'  • {error}'))
        else:
            self.stdout.write(
                self.style.SUCCESS('\n🎉 All recipes processed successfully!')
            )

    def create_recipe(self, recipe_data, ingredients, categories, cooking_methods, tags):
        ingredient_created_count = 0
        tag_created_count = 0
        method_created_count = 0

        # Get or create cooking method
        cooking_method_name = recipe_data['cooking_method']
        cooking_method_lower = cooking_method_name.lower()

        cooking_method = cooking_methods.get(cooking_method_lower)
        if not cooking_method:
            cooking_method = CookingMethod.objects.create(
                name=cooking_method_name
            )
            cooking_methods[cooking_method_lower] = cooking_method
            method_created_count += 1
            self.stdout.write(
                self.style.WARNING(f'   Created new cooking method: {cooking_method_name}')
            )

        # Create recipe
        recipe = Recipe.objects.create(
            name=recipe_data['name'],
            description=recipe_data['description'],
            cooking_time=recipe_data['cooking_time'],
            difficulty=recipe_data['difficulty'],
            cooking_method=cooking_method,
            instructions=recipe_data['instructions'],
            portions=recipe_data['portions'],
            is_premium=True  # Set premium flag as requested
        )

        # Add tags
        recipe_tags = []
        for tag_name in recipe_data['tags']:
            tag_lower = tag_name.lower()
            tag = tags.get(tag_lower)
            if not tag:
                tag = Tag.objects.create(
                    name=tag_name,
                    color=self.get_default_tag_color(tag_name),
                    description=f"Автоматически созданный тег для {tag_name}"
                )
                tags[tag_lower] = tag
                tag_created_count += 1
                self.stdout.write(
                    self.style.WARNING(f'   Created new tag: {tag_name}')
                )
            recipe_tags.append(tag)

        recipe.tags.set(recipe_tags)

        # Create recipe ingredients
        for ing_data in recipe_data['ingredients']:
            ingredient_name = ing_data['name']
            ingredient_name_lower = ingredient_name.lower()
            quantity = ing_data['quantity']

            ingredient = ingredients.get(ingredient_name_lower)

            if not ingredient:
                # Create new ingredient with appropriate category and unit
                category, unit = self.determine_category_and_unit(ingredient_name, categories)
                ingredient = Ingredient.objects.create(
                    name=ingredient_name,
                    category=category,
                    default_unit=unit
                )
                ingredients[ingredient_name_lower] = ingredient
                ingredient_created_count += 1
                self.stdout.write(
                    self.style.WARNING(f'   Created new ingredient: {ingredient_name} ({unit})')
                )

            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ingredient,
                quantity=quantity
            )

        return True, ingredient_created_count, tag_created_count, method_created_count

    def determine_category_and_unit(self, ingredient_name, categories):
        """
        Determine appropriate category and unit for new ingredients
        based on ingredient name and doctor's recommendations
        """
        # Default values
        category_name = "Прочее"
        unit = "g"

        ingredient_lower = ingredient_name.lower()

        # Vegetable detection
        veg_keywords = ['помидор', 'огурец', 'перец', 'капуста', 'морковь',
                       'лук', 'кабачок', 'брокколи', 'шпинат', 'салат', 'цуккини']
        # Fruit detection
        fruit_keywords = ['яблоко', 'банан', 'апельсин', 'лимон', 'лайм',
                         'ягода', 'малина', 'клубника', 'черника', 'авокадо',
                         'груша', 'киви', 'персик']
        # Protein detection
        protein_keywords = ['куриц', 'грудк', 'филе', 'говядин', 'треск',
                           'тунец', 'творог', 'йогурт', 'кефир', 'сыр', 'индейк']
        # Grain detection
        grain_keywords = ['гречк', 'овсян', 'булгур', 'рис', 'макарон', 'хлопья']
        # Nut detection
        nut_keywords = ['орех', 'миндаль', 'грецкий', 'кедровый', 'семена', 'курага']
        # Dairy detection
        dairy_keywords = ['молоко', 'йогурт', 'кефир', 'творог', 'сметана']
        # Oil detection
        oil_keywords = ['масло', 'оливков', 'миндальн']
        # Sweet detection
        sweet_keywords = ['мед', 'сироп']
        # Bread detection
        bread_keywords = ['хлеб', 'тост']

        if any(keyword in ingredient_lower for keyword in veg_keywords):
            category_name = "Овощи и зелень"
            if any(word in ingredient_lower for word in ['помидор', 'капуста', 'лук', 'морковь']):
                unit = "kg"
            else:
                unit = "g"

        elif any(keyword in ingredient_lower for keyword in fruit_keywords):
            category_name = "Фрукты и ягоды"
            if any(word in ingredient_lower for word in ['яблоко', 'банан', 'апельсин', 'лимон', 'груша', 'персик']):
                unit = "kg"
            else:
                unit = "g"

        elif any(keyword in ingredient_lower for keyword in protein_keywords):
            if any(word in ingredient_lower for word in ['куриц', 'говядин', 'филе', 'индейк']):
                category_name = "Мясо и птица"
            elif any(word in ingredient_lower for word in ['треск', 'тунец']):
                category_name = "Рыба и морепродукты"
            elif any(word in ingredient_lower for word in dairy_keywords):
                category_name = "Молочные продукты"
            unit = "g"

        elif any(keyword in ingredient_lower for keyword in grain_keywords):
            category_name = "Крупы и макароны"
            unit = "g"

        elif any(keyword in ingredient_lower for keyword in nut_keywords):
            category_name = "Орехи и сухофрукты"
            unit = "g"

        elif any(keyword in ingredient_lower for keyword in oil_keywords):
            category_name = "Масла и жиры"
            unit = "ml" if 'масло' in ingredient_lower else "g"

        elif any(keyword in ingredient_lower for keyword in sweet_keywords):
            category_name = "Сладости"
            unit = "g"

        elif any(keyword in ingredient_lower for keyword in bread_keywords):
            category_name = "Хлеб и выпечка"
            unit = "pcs"

        elif 'бульон' in ingredient_lower:
            category_name = "Бакалея"
            unit = "ml"

        elif 'уксус' in ingredient_lower:
            category_name = "Соусы и приправы"
            unit = "ml"

        elif any(word in ingredient_lower for word in ['корица', 'травы', 'перец']):
            category_name = "Специи и травы"
            unit = "g"

        category = categories.get(category_name)
        if not category:
            # If category doesn't exist, use "Прочее"
            category = categories.get("Прочее")

        return category, unit

    def get_default_tag_color(self, tag_name):
        """
        Assign appropriate colors to new tags based on their type
        """
        color_map = {
            # Breakfast tags
            'Завтрак': '#FF6B35',
            'Быстро': '#4ECDC4',
            # Meal type tags
            'Обед': '#45B7D1',
            'Ужин': '#96CEB4',
            'Перекус': '#FFEAA7',
            # Dietary tags
            'Диетическое': '#DDA0DD',
            'Полезно': '#98D8C8',
            'Сытно': '#F7DC6F',
            # Food type tags
            'Овощное': '#A2D9CE',
            'Мясное': '#F1948A',
            'Рыба и морепродукты': '#85C1E9',
            'Сладкое': '#F8C471',
            # Style tags
            'Семейный': '#BB8FCE',
            'Ресторанное': '#E59866',
            'Просто': '#7FB3D5'
        }

        return color_map.get(tag_name, '#808080')  # Default gray color