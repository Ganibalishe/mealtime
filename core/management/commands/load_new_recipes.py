# management/commands/load_new_recipes.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from django.core.files.base import ContentFile
from core.models import (
    Ingredient, IngredientCategory, CookingMethod, Tag,
    Recipe, RecipeIngredient
)

class Command(BaseCommand):
    help = 'Загружает новые рецепты из JSON файла в базу данных'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='recipes.json',
            help='Путь к JSON файлу с рецептами'
        )

    def handle(self, *args, **options):
        file_path = options['file']

        # Загружаем все существующие данные
        existing_ingredients = {ing.name.lower(): ing for ing in Ingredient.objects.all()}
        existing_categories = {cat.name: cat for cat in IngredientCategory.objects.all()}
        existing_cooking_methods = {method.name: method for method in CookingMethod.objects.all()}
        existing_tags = {tag.name: tag for tag in Tag.objects.all()}

        # Читаем JSON файл
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                recipes_data = json.load(f)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'Файл {file_path} не найден'))
            return
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'Ошибка чтения JSON: {e}'))
            return

        success_count = 0
        error_count = 0

        with transaction.atomic():
            for recipe_data in recipes_data:
                try:
                    self.create_recipe(
                        recipe_data,
                        existing_ingredients,
                        existing_categories,
                        existing_cooking_methods,
                        existing_tags
                    )
                    success_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'Рецепт "{recipe_data["name"]}" создан')
                    )
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f'Ошибка создания рецепта "{recipe_data["name"]}": {e}')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'Загрузка завершена: {success_count} успешно, {error_count} с ошибками'
            )
        )

    def create_recipe(self, recipe_data, existing_ingredients, existing_categories,
                     existing_cooking_methods, existing_tags):
        """Создает один рецепт со всеми связями"""

        # Находим или создаем способ приготовления
        cooking_method_name = recipe_data['cooking_method']
        cooking_method = existing_cooking_methods.get(cooking_method_name)
        if not cooking_method:
            cooking_method = CookingMethod.objects.create(name=cooking_method_name)
            existing_cooking_methods[cooking_method_name] = cooking_method

        # Создаем рецепт
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

        # Добавляем теги
        for tag_name in recipe_data['tags']:
            tag = existing_tags.get(tag_name)
            if not tag:
                # Создаем новый тег с цветом по умолчанию
                tag = Tag.objects.create(
                    name=tag_name,
                    color='#808080',
                    description=f'Автоматически созданный тег для {tag_name}'
                )
                existing_tags[tag_name] = tag
            recipe.tags.add(tag)

        # Добавляем ингредиенты
        for ing_data in recipe_data['ingredients']:
            ingredient_name = ing_data['name']
            quantity = ing_data['quantity']

            # Ищем существующий ингредиент
            ingredient = existing_ingredients.get(ingredient_name.lower())

            if not ingredient:
                # Создаем новый ингредиент
                ingredient = self.create_new_ingredient(ingredient_name, existing_categories)
                existing_ingredients[ingredient_name.lower()] = ingredient

            # Создаем связь рецепт-ингредиент
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ingredient,
                quantity=quantity
            )

        return recipe

    def create_new_ingredient(self, ingredient_name, existing_categories):
        """Создает новый ингредиент с автоматическим определением категории и единицы измерения"""

        # Определяем категорию по логике
        category_name = self.determine_category(ingredient_name)
        category = existing_categories.get(category_name)

        if not category:
            # Создаем новую категорию если не найдена
            category = IngredientCategory.objects.create(
                name=category_name,
                order=99
            )
            existing_categories[category_name] = category

        # Определяем единицу измерения
        default_unit = self.determine_unit(ingredient_name, category_name)

        # Создаем ингредиент
        ingredient = Ingredient.objects.create(
            name=ingredient_name,
            category=category,
            default_unit=default_unit
        )

        self.stdout.write(
            self.style.WARNING(f'Создан новый ингредиент: {ingredient_name}')
        )

        return ingredient

    def determine_category(self, ingredient_name):
        """Определяет категорию ингредиента по его названию"""
        vegetable_keywords = ['помидор', 'огурец', 'картофель', 'морковь', 'лук', 'капуста',
                             'перец', 'баклажан', 'кабачок', 'тыква', 'свекла', 'редис', 'салат',
                             'редис', 'редиска', 'редис', 'редиска', 'редис', 'редиска']
        fruit_keywords = ['яблоко', 'апельсин', 'банан', 'лимон', 'груша', 'персик', 'абрикос',
                         'виноград', 'клубника', 'малина', 'черника', 'ежевика', 'арбуз', 'дыня']
        meat_keywords = ['куриц', 'говядин', 'свинин', 'баранин', 'телятин', 'индейк', 'утк',
                        'гус', 'кролик', 'оленин', 'стейк', 'фарш', 'грудинк', 'бедр', 'крылышк']
        fish_keywords = ['лосось', 'семга', 'форель', 'треск', 'окунь', 'щук', 'карп', 'сом',
                        'креветк', 'кальмар', 'миди', 'устриц', 'икра', 'краб', 'омары']
        dairy_keywords = ['молоко', 'сыр', 'творог', 'сметан', 'йогурт', 'кефир', 'простокваш',
                         'ряженк', 'сливки', 'масло сливочн', 'маргарин']

        ingredient_lower = ingredient_name.lower()

        if any(keyword in ingredient_lower for keyword in vegetable_keywords):
            return 'Овощи и зелень'
        elif any(keyword in ingredient_lower for keyword in fruit_keywords):
            return 'Фрукты и ягоды'
        elif any(keyword in ingredient_lower for keyword in meat_keywords):
            return 'Мясо и птица'
        elif any(keyword in ingredient_lower for keyword in fish_keywords):
            return 'Рыба и морепродукты'
        elif any(keyword in ingredient_lower for keyword in dairy_keywords):
            return 'Молочные продукты'
        elif 'яйц' in ingredient_lower:
            return 'Яйца'
        elif 'круп' in ingredient_lower or 'макарон' in ingredient_lower or 'рис' in ingredient_lower:
            return 'Крупы и макароны'
        elif 'мук' in ingredient_lower:
            return 'Мука и смеси'
        elif 'масл' in ingredient_lower:
            return 'Масла и жиры'
        elif 'специ' in ingredient_lower or 'трав' in ingredient_lower:
            return 'Специи и травы'
        elif 'орех' in ingredient_lower or 'семечк' in ingredient_lower:
            return 'Орехи и сухофрукты'
        else:
            return 'Прочее'

    def determine_unit(self, ingredient_name, category_name):
        """Определяет единицу измерения для ингредиента"""
        ingredient_lower = ingredient_name.lower()

        # Овощи и фрукты обычно в кг
        if category_name in ['Овощи и зелень', 'Фрукты и ягоды']:
            return 'kg'

        # Мясо, рыба, сыры - в граммах
        elif category_name in ['Мясо и птица', 'Рыба и морепродукты', 'Сыры']:
            return 'g'

        # Жидкие молочные продукты - в мл
        elif category_name == 'Молочные продукты' and any(word in ingredient_lower for word in ['молоко', 'кефир', 'сливки']):
            return 'ml'

        # Яйца - штуки
        elif category_name == 'Яйца':
            return 'pcs'

        # Крупы, мука, сахар - в граммах
        elif category_name in ['Крупы и макароны', 'Мука и смеси']:
            return 'g'

        # Масла - мл для жидкостей, г для твердых
        elif category_name == 'Масла и жиры':
            if any(word in ingredient_lower for word in ['масло растительное', 'оливковое', 'кунжутное']):
                return 'ml'
            else:
                return 'g'

        # Соусы - мл для жидкостей
        elif category_name == 'Соусы и приправы':
            return 'ml' if any(word in ingredient_lower for word in ['соус', 'уксус']) else 'g'

        # Специи - граммы
        elif category_name == 'Специи и травы':
            return 'g'

        # По умолчанию - граммы
        else:
            return 'g'