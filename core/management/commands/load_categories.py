# management/commands/load_categories.py
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import IngredientCategory

class Command(BaseCommand):
    help = 'Load ingredient categories into database'

    def handle(self, *args, **options):
        categories_data = [
            {"name": "Овощи и зелень", "order": 1},
            {"name": "Фрукты и ягоды", "order": 2},
            {"name": "Мясо и птица", "order": 3},
            {"name": "Рыба и морепродукты", "order": 4},
            {"name": "Молочные продукты", "order": 5},
            {"name": "Яйца", "order": 6},
            {"name": "Сыры", "order": 7},
            {"name": "Колбасы и сосиски", "order": 8},
            {"name": "Хлеб и выпечка", "order": 9},
            {"name": "Крупы и макароны", "order": 10},
            {"name": "Бобовые", "order": 11},
            {"name": "Мука и смеси", "order": 12},
            {"name": "Масла и жиры", "order": 13},
            {"name": "Соусы и приправы", "order": 14},
            {"name": "Специи и травы", "order": 15},
            {"name": "Орехи и сухофрукты", "order": 16},
            {"name": "Консервы", "order": 17},
            {"name": "Чай и кофе", "order": 18},
            {"name": "Напитки", "order": 19},
            {"name": "Сладости", "order": 20},
            {"name": "Замороженные продукты", "order": 21},
            {"name": "Бакалея", "order": 22},
            {"name": "Прочее", "order": 99},
        ]

        created_count = 0
        existing_count = 0

        with transaction.atomic():
            for cat_data in categories_data:
                category, created = IngredientCategory.objects.get_or_create(
                    name=cat_data["name"],
                    defaults={"order": cat_data["order"]}
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Создана категория: {cat_data["name"]}')
                    )
                    created_count += 1
                else:
                    # Обновляем порядок, если категория уже существует
                    if category.order != cat_data["order"]:
                        category.order = cat_data["order"]
                        category.save()
                        self.stdout.write(
                            self.style.WARNING(f'🔄 Обновлен порядок: {cat_data["name"]} → {cat_data["order"]}')
                        )
                    else:
                        self.stdout.write(
                            self.style.NOTICE(f'📁 Существует: {cat_data["name"]}')
                        )
                    existing_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎉 Готово! Создано: {created_count}, Существовало: {existing_count}, Всего: {created_count + existing_count}'
            )
        )

        # Показываем итоговый список
        self.stdout.write("\n📋 Итоговый список категорий:")
        for category in IngredientCategory.objects.all().order_by('order'):
            self.stdout.write(f'  {category.order:2d}. {category.name}')