
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import CookingMethod

class Command(BaseCommand):
    help = 'Load cooking methods into database'

    def handle(self, *args, **options):
        cooking_methods_data = [
            "Варка",
            "Жарка",
            "Запекание",
            "Тушение",
            "Гриль",
            "Пароварка",
            "Микроволновая печь",
            "Сыроедение",
            "Копчение",
            "Варка на пару",
            "Бланширование",
            "Маринование",
            "Фритюр",
            "Припускание",
            "Пассерование",
            "Консервирование",
            "Сушка",
            "Вяление",
            "Ферментация",
            "Соление",
            "Квашение",
            "Замораживание",
            "Разогрев",
            "Приготовление в мультиварке",
            "Приготовление в аэрогриле",
            "Приготовление в духовке",
            "Приготовление на мангале",
            "Приготовление на сковороде-гриль",
            "Приготовление в казане",
            "Приготовление в горшочках"
        ]

        created_count = 0
        existing_count = 0

        with transaction.atomic():
            for method_name in cooking_methods_data:
                method, created = CookingMethod.objects.get_or_create(
                    name=method_name
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Создан метод: {method_name}')
                    )
                    created_count += 1
                else:
                    self.stdout.write(
                        self.style.NOTICE(f'📁 Существует: {method_name}')
                    )
                    existing_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎉 Готово! Создано: {created_count}, Существовало: {existing_count}, Всего: {created_count + existing_count}'
            )
        )

        # Показываем итоговый список
        self.stdout.write("\n🍳 Итоговый список методов приготовления:")
        for method in CookingMethod.objects.all().order_by('name'):
            self.stdout.write(f'  - {method.name}')