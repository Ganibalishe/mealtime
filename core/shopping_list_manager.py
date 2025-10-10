from django.db import models
from django.utils import timezone
from .models import ShoppingList, ShoppingListItem, MealPlan
from .shopping_list_generator import (
    generate_shopping_list,
    create_shopping_list_from_aggregation,
)


def get_or_create_shopping_list(user, start_date, end_date, list_name=None):
    """
    Умное создание/обновление списка покупок:
    - Проверяет существующие списки за период
    - Сравнивает с текущими планами питания
    - Обновляет при изменениях или создает новый
    """
    # 1. Ищем существующие списки за этот период
    existing_lists = ShoppingList.objects.filter(
        user=user,
        period_start=start_date,
        period_end=end_date,
        status__in=["draft", "active"],  # Рассматриваем только активные списки
    ).prefetch_related("base_meal_plans", "items")

    # 2. Генерируем актуальные данные
    aggregated_ingredients, current_meal_plans = generate_shopping_list(
        user, start_date, end_date, list_name
    )

    if not aggregated_ingredients:
        return None, "Нет данных для генерации списка покупок"

    # 3. Если нет существующих списков - создаем новый
    if not existing_lists.exists():
        shopping_list = create_shopping_list_from_aggregation(
            user, aggregated_ingredients, current_meal_plans, list_name
        )
        return shopping_list, "created"

    # 4. Проверяем каждый существующий список на актуальность
    for existing_list in existing_lists:
        if is_shopping_list_up_to_date(
            existing_list, current_meal_plans, aggregated_ingredients
        ):
            # Список актуален - возвращаем его
            return existing_list, "exists"
        else:
            # Список устарел - обновляем его
            updated_list = update_shopping_list(
                existing_list, aggregated_ingredients, current_meal_plans
            )
            return updated_list, "updated"

    # 5. Если все существующие списки устарели (маловероятно, но на всякий случай)
    shopping_list = create_shopping_list_from_aggregation(
        user, aggregated_ingredients, current_meal_plans, list_name
    )
    return shopping_list, "created"


def is_shopping_list_up_to_date(shopping_list, current_meal_plans, current_ingredients):
    """
    Проверяет, актуален ли список покупок
    """
    # 1. Проверяем, совпадают ли привязанные планы питания
    existing_meal_plan_ids = set(
        shopping_list.base_meal_plans.values_list("id", flat=True)
    )
    current_meal_plan_ids = set(mp.id for mp in current_meal_plans)

    if existing_meal_plan_ids != current_meal_plan_ids:
        return False

    # 2. Проверяем, совпадают ли ингредиенты и их количества
    current_items_map = {}
    for ingredient_data in current_ingredients:
        key = f"{ingredient_data['ingredient'].id}_{ingredient_data['unit']}"
        current_items_map[key] = ingredient_data["quantity"]

    existing_items = shopping_list.items.select_related("ingredient").all()
    existing_items_map = {}
    for item in existing_items:
        key = f"{item.ingredient.id}_{item.unit}"
        existing_items_map[key] = float(item.quantity)

    # Сравниваем количество элементов
    if set(current_items_map.keys()) != set(existing_items_map.keys()):
        return False

    # Сравниваем количества (с допуском для float)
    for key, current_qty in current_items_map.items():
        existing_qty = existing_items_map.get(key, 0)
        if abs(current_qty - existing_qty) > 0.01:  # Допуск 0.01
            return False

    return True


def update_shopping_list(shopping_list, aggregated_ingredients, meal_plans):
    """
    Обновляет существующий список покупок новыми данными
    """
    # 1. Помечаем старые элементы как удаленные (soft delete) или удаляем физически
    shopping_list.items.all().delete()

    # 2. Обновляем базовую информацию
    shopping_list.name = f"{shopping_list.name}"
    shopping_list.updated_at = timezone.now()
    shopping_list.is_outdated = False

    # 3. Обновляем привязку к планам питания
    shopping_list.base_meal_plans.set(meal_plans)

    # 4. Создаем новые элементы
    for order, agg_data in enumerate(aggregated_ingredients):
        ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            ingredient=agg_data["ingredient"],
            quantity=agg_data["quantity"],
            unit=agg_data["unit"],
            category=agg_data["category"],
            order=order,
        )

    # 5. Сохраняем изменения
    shopping_list.save()

    return shopping_list


def archive_old_shopping_lists(user, start_date, end_date):
    """
    Архивирует старые списки за тот же период (кроме самого нового)
    """
    # Находим самый новый список за период
    latest_list = (
        ShoppingList.objects.filter(
            user=user, period_start=start_date, period_end=end_date
        )
        .order_by("-created_at")
        .first()
    )

    if latest_list:
        # Архивируем все остальные списки за этот период
        ShoppingList.objects.filter(
            user=user, period_start=start_date, period_end=end_date
        ).exclude(id=latest_list.id).update(status="archived", is_outdated=True)


def get_shopping_list_history(user, days=30):
    """Получает историю списков покупок за указанный период"""
    from datetime import timedelta
    from django.utils import timezone

    start_date = timezone.now().date() - timedelta(days=days)

    return ShoppingList.objects.filter(
        user=user, created_at__date__gte=start_date
    ).order_by("-created_at")


def compare_shopping_lists(list1_id, list2_id):
    """Сравнивает два списка покупок"""
    list1 = ShoppingList.objects.get(id=list1_id)
    list2 = ShoppingList.objects.get(id=list2_id)

    differences = []

    items1 = {item.ingredient.id: item for item in list1.items.all()}
    items2 = {item.ingredient.id: item for item in list2.items.all()}

    all_ingredient_ids = set(items1.keys()) | set(items2.keys())

    for ing_id in all_ingredient_ids:
        item1 = items1.get(ing_id)
        item2 = items2.get(ing_id)

        if item1 and not item2:
            differences.append(f"❌ {item1.ingredient.name} удален из списка")
        elif not item1 and item2:
            differences.append(f"✅ {item2.ingredient.name} добавлен в список")
        elif item1 and item2:
            if abs(float(item1.quantity) - float(item2.quantity)) > 0.01:
                differences.append(
                    f"📊 {item1.ingredient.name}: {item1.quantity} → {item2.quantity}"
                )

    return differences
