# management/commands/load_ingredients.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import IngredientCategory, Ingredient

class Command(BaseCommand):
    help = 'Load ingredients from JSON file into database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Path to JSON file with ingredients',
            default='ingredients.json'
        )

    def load_categories_map(self):
        """Загружает все категории в словарь для быстрого поиска"""
        categories = {}
        for category in IngredientCategory.objects.all():
            categories[category.name] = category
        return categories

    @transaction.atomic
    def handle(self, *args, **options):
        file_path = options['file']

        if not os.path.exists(file_path):
            self.stdout.write(
                self.style.ERROR(f'File {file_path} not found!')
            )
            return

        # Загружаем категории
        categories_map = self.load_categories_map()
        self.stdout.write(f"Loaded {len(categories_map)} categories")

        # Читаем JSON с ингредиентами
        with open(file_path, 'r', encoding='utf-8') as f:
            ingredients_data = json.load(f)

        created_count = 0
        updated_count = 0
        error_count = 0

        for ing_data in ingredients_data:
            try:
                category_name = ing_data["category"]
                category = categories_map.get(category_name)

                if not category:
                    self.stdout.write(
                        self.style.ERROR(f'Category "{category_name}" not found for ingredient {ing_data["name"]}')
                    )
                    error_count += 1
                    continue

                # Создаем или обновляем ингредиент
                ingredient, created = Ingredient.objects.get_or_create(
                    name=ing_data["name"],
                    defaults={
                        "category": category,
                        "default_unit": ing_data["default_unit"]
                    }
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Created: {ing_data["name"]} ({ing_data["default_unit"]})')
                    )
                    created_count += 1
                else:
                    # Обновляем, если что-то изменилось
                    if (ingredient.category != category or
                        ingredient.default_unit != ing_data["default_unit"]):
                        ingredient.category = category
                        ingredient.default_unit = ing_data["default_unit"]
                        ingredient.save()
                        self.stdout.write(
                            self.style.WARNING(f'🔄 Updated: {ing_data["name"]}')
                        )
                        updated_count += 1
                    else:
                        self.stdout.write(
                            self.style.NOTICE(f'📁 Exists: {ing_data["name"]}')
                        )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error with {ing_data["name"]}: {str(e)}')
                )
                error_count += 1

        # Итоговая статистика
        self.stdout.write("\n" + "="*50)
        self.stdout.write(
            self.style.SUCCESS(
                f"🎉 Итог: Создано: {created_count}, Обновлено: {updated_count}, Ошибок: {error_count}"
            )
        )

        # Показываем список всех ингредиентов по категориям
        self.stdout.write("\n📋 Итоговый список ингредиентов по категориям:")
        for category in IngredientCategory.objects.all().order_by('order'):
            ingredients = Ingredient.objects.filter(category=category).order_by('name')
            if ingredients.exists():
                self.stdout.write(f"\n{category.name}:")
                for ing in ingredients:
                    self.stdout.write(f"  - {ing.name} ({ing.get_default_unit_display()})")