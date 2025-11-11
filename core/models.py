import uuid
from django.db import models
from django.contrib.auth.models import User
from .utils import get_unit_display


class IngredientCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Название категории")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок сортировки")

    class Meta:
        verbose_name = "Категория ингредиентов"
        verbose_name_plural = "Категории ингредиентов"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class CookingMethod(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, verbose_name="Способ приготовления")

    class Meta:
        verbose_name = "Способ приготовления"
        verbose_name_plural = "Способы приготовления"

    def __str__(self):
        return self.name


class Ingredient(models.Model):
    UNITS = [
        ("g", "гр."),
        ("kg", "кг."),
        ("ml", "мл."),
        ("l", "л."),
        ("pcs", "шт."),
        ("tsp", "Чайные ложки"),
        ("tbsp", "Столовые ложки"),
        ("pinch", "Щепотка"),
        ("to_taste", "По вкусу"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    category = models.ForeignKey(
        IngredientCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Категория",
    )
    default_unit = models.CharField(
        max_length=50, choices=UNITS, default="pcs", verbose_name="Единица по умолчанию"
    )

    class Meta:
        verbose_name = "Ингредиент"
        verbose_name_plural = "Ингредиенты"

    def __str__(self):
        return f"{self.name} ({self.get_default_unit_display()})"

    def get_default_unit_display(self):
        """Возвращает читаемое название единицы измерения"""
        return dict(self.UNITS).get(self.default_unit, self.default_unit)


class Tag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name="Название тега")
    color = models.CharField(
        max_length=7, default="#808080", verbose_name="Цвет тега"
    )  # HEX цвет
    description = models.TextField(blank=True, null=True, verbose_name="Описание тега")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")

    class Meta:
        verbose_name = "Тег"
        verbose_name_plural = "Теги"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def get_color_display(self):
        """Возвращает цвет для отображения"""
        return self.color if self.color else "#808080"


class PremiumMealPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name="Название меню")
    description = models.TextField(verbose_name="Описание")
    price = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True, verbose_name="Стоимость"
    )
    is_free = models.BooleanField(default=False, verbose_name="Бесплатное меню")
    duration_days = models.IntegerField(
        default=7, verbose_name="Продолжительность (дней)"
    )
    is_active = models.BooleanField(default=True, verbose_name="Активно")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Связи с существующими моделями
    tags = models.ManyToManyField(Tag, blank=True, verbose_name="Теги")

    class Meta:
        verbose_name = "Премиум меню"
        verbose_name_plural = "Премиум меню"
        ordering = ["-created_at"]

    def __str__(self):
        free_label = " (Бесплатное)" if self.is_free else ""
        return f"{self.name}{free_label}"

    def save(self, *args, **kwargs):
        # Автоматически помечаем как бесплатное если цена не указана
        if self.price is None:
            self.is_free = True
        super().save(*args, **kwargs)


class Recipe(models.Model):
    DIFFICULTY_LEVELS = [
        ("easy", "Легко"),
        ("medium", "Средне"),
        ("hard", "Сложно"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название блюда")
    description = models.TextField(blank=True, null=True, verbose_name="Описание")
    cooking_time = models.PositiveIntegerField(
        blank=True, null=True, verbose_name="Время приготовления (мин)"
    )
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_LEVELS,
        default="medium",
        verbose_name="Сложность",
    )
    cooking_method = models.ForeignKey(
        CookingMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Способ приготовления",
    )
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        verbose_name="Теги",
        help_text="Выберите теги для этого рецепта",
    )
    instructions = models.TextField(verbose_name="Пошаговый рецепт")
    image = models.ImageField(
        upload_to="recipes/", blank=True, null=True, verbose_name="Изображение"
    )
    portions = models.PositiveIntegerField(default=2, verbose_name="Количество порций")
    is_premium = models.BooleanField(default=False, verbose_name="Премиум рецепт")
    available_in_premium_menus = models.ManyToManyField(
        PremiumMealPlan,
        through="PremiumMealPlanRecipe",
        blank=True,
        verbose_name="Доступен в премиум меню",
        related_name="contained_recipes",
    )

    class Meta:
        verbose_name = "Рецепт"
        verbose_name_plural = "Рецепты"

    def __str__(self):
        return f"{self.name} ({self.get_difficulty_display()})"

    def get_difficulty_display(self):
        """Возвращает читаемое название сложности"""
        return dict(self.DIFFICULTY_LEVELS).get(self.difficulty, self.difficulty)

    def get_tags_display(self):
        """Возвращает строку с тегами"""
        return ", ".join([tag.name for tag in self.tags.all()])


class RecipeIngredient(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipe = models.ForeignKey(
        Recipe, on_delete=models.CASCADE, related_name="ingredients"
    )
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="Количество"
    )

    class Meta:
        verbose_name = "Ингредиент в рецепте"
        verbose_name_plural = "Ингредиенты в рецептах"

    def __str__(self):
        return f"{self.ingredient.name} - {self.quantity}"


class MealPlan(models.Model):
    MEAL_TYPES = [
        ("breakfast", "Завтрак"),
        ("lunch", "Обед"),
        ("dinner", "Ужин"),
        ("snack", "Перекус"),
        ("supper", "Поздний ужин"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, verbose_name="Пользователь"
    )
    date = models.DateField(verbose_name="Дата")
    meal_type = models.CharField(
        max_length=50, choices=MEAL_TYPES, verbose_name="Прием пищи"
    )

    class Meta:
        verbose_name = "План питания"
        verbose_name_plural = "Планы питания"
        unique_together = ["user", "date", "meal_type"]
        ordering = ["date", "meal_type"]

    def __str__(self):
        meal_type_display = dict(self.MEAL_TYPES).get(self.meal_type, self.meal_type)
        return f"{self.user.username} - {self.date} - {meal_type_display}"

    def get_meal_type_display(self):
        """Возвращает читаемое название приема пищи"""
        return dict(self.MEAL_TYPES).get(self.meal_type, self.meal_type)


class PremiumMealPlanRecipe(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    premium_meal_plan = models.ForeignKey(
        PremiumMealPlan, on_delete=models.CASCADE, related_name="premium_recipes"
    )
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, verbose_name="Рецепт")
    day_number = models.IntegerField(
        verbose_name="День меню"
    )  # 1, 2, 3... duration_days
    meal_type = models.CharField(
        max_length=50,
        choices=MealPlan.MEAL_TYPES,  # Используем существующие типы приемов пищи
        verbose_name="Прием пищи",
    )
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")

    class Meta:
        verbose_name = "Рецепт в премиум меню"
        verbose_name_plural = "Рецепты в премиум меню"
        ordering = ["day_number", "meal_type", "order"]
        unique_together = ["premium_meal_plan", "day_number", "meal_type", "order"]

    def __str__(self):
        return f"{self.premium_meal_plan.name} - День {self.day_number} - {self.get_meal_type_display()}"

    def get_meal_type_display(self):
        """Возвращает читаемое название приема пищи"""
        return dict(MealPlan.MEAL_TYPES).get(self.meal_type, self.meal_type)

class RecipeMealPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meal_plan = models.ForeignKey(
        MealPlan, on_delete=models.CASCADE, related_name="recipes"
    )
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, verbose_name="Рецепт")
    portions = models.PositiveIntegerField(default=2, verbose_name="Количество порций")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")

    class Meta:
        verbose_name = "Рецепт в плане питания"
        verbose_name_plural = "Рецепты в плане питания"
        ordering = ["order"]

    def __str__(self):
        return f"{self.meal_plan} - {self.recipe.name} ({self.portions} порц.)"


class ShoppingList(models.Model):
    STATUS_CHOICES = [
        ("draft", "Черновик"),
        ("active", "Активный"),
        ("completed", "Завершенный"),
        ("archived", "В архиве"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, verbose_name="Пользователь"
    )
    name = models.CharField(
        max_length=255, verbose_name="Название списка", default="Мой список покупок"
    )

    # Период, на который сгенерирован список
    period_start = models.DateField(verbose_name="Начало периода")
    period_end = models.DateField(verbose_name="Конец периода")

    # Статус списка
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Завершен")

    # Практические метрики вместо стоимости
    total_items = models.PositiveIntegerField(default=0, verbose_name="Всего позиций")
    items_checked = models.PositiveIntegerField(
        default=0, verbose_name="Куплено позиций"
    )

    # Связь с планами питания для отслеживания актуальности
    is_outdated = models.BooleanField(default=False, verbose_name="Устарел")
    base_meal_plans = models.ManyToManyField(
        "MealPlan", verbose_name="Основано на планах питания"
    )

    class Meta:
        verbose_name = "Список покупок"
        verbose_name_plural = "Списки покупок"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.period_start} - {self.period_end})"

    def save(self, *args, **kwargs):
        # Автоматически обновляем счетчики при сохранении
        if self.pk:
            self.total_items = self.items.count()
            self.items_checked = self.items.filter(checked=True).count()
        super().save(*args, **kwargs)

    def mark_as_outdated(self):
        """Пометить список как устаревший (при изменении планов питания)"""
        self.is_outdated = True
        self.save()

    def get_progress(self):
        """Прогресс выполнения списка в процентах"""
        if self.total_items == 0:
            return 0
        return round((self.items_checked / self.total_items) * 100)


class ShoppingListItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shopping_list = models.ForeignKey(
        ShoppingList, on_delete=models.CASCADE, related_name="items"
    )
    ingredient = models.ForeignKey(
        "Ingredient", on_delete=models.CASCADE, verbose_name="Ингредиент"
    )
    unit = models.CharField(max_length=50, blank=True, verbose_name="Единица измерения")

    def get_unit(self):
        """Возвращает unit - либо из поля, либо из ингредиента"""
        return self.unit or self.ingredient.default_unit

    def get_unit_display(self):
        """Возвращает читаемое название единицы измерения"""
        unit_to_use = self.unit or self.ingredient.default_unit
        return dict(Ingredient.UNITS).get(unit_to_use, unit_to_use)

    # Количество и единица измерения
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="Количество"
    )
    unit = models.CharField(max_length=50, verbose_name="Единица измерения")

    # Статус элемента
    checked = models.BooleanField(default=False, verbose_name="Куплено")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок сортировки")

    # Категория для группировки в списке
    category = models.ForeignKey(
        "IngredientCategory",
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="Категория",
    )

    # Пользовательские правки
    custom_name = models.CharField(
        max_length=255, blank=True, verbose_name="Пользовательское название"
    )
    notes = models.TextField(blank=True, verbose_name="Заметки")

    class Meta:
        verbose_name = "Элемент списка покупок"
        verbose_name_plural = "Элементы списка покупок"
        ordering = ["category__order", "order", "ingredient__name"]

    def __str__(self):
        display_name = self.custom_name or self.ingredient.name
        return f"{display_name} - {self.quantity} {self.unit}"


class ShoppingListTemplate(models.Model):
    """Шаблоны для часто используемых списков (базовые покупки)"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, verbose_name="Пользователь"
    )
    name = models.CharField(max_length=255, verbose_name="Название шаблона")
    description = models.TextField(blank=True, verbose_name="Описание")
    created_at = models.DateTimeField(auto_now_add=True)
    is_default = models.BooleanField(default=False, verbose_name="Шаблон по умолчанию")

    class Meta:
        verbose_name = "Шаблон списка покупок"
        verbose_name_plural = "Шаблоны списков покупок"

    def __str__(self):
        return self.name


class TemplateItem(models.Model):
    template = models.ForeignKey(
        ShoppingListTemplate, on_delete=models.CASCADE, related_name="items"
    )
    ingredient = models.ForeignKey("Ingredient", on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit = models.CharField(max_length=50)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def get_unit_display(self):
        """Возвращает читаемое название единицы измерения"""
        return dict(Ingredient.UNITS).get(self.unit, self.unit)


class UserPurchase(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Оплачен'),
        ('processing', 'В обработке'),
        ('cancelled', 'Отказ'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, verbose_name="Пользователь"
    )
    premium_meal_plan = models.ForeignKey(
        PremiumMealPlan, on_delete=models.CASCADE, verbose_name="Премиум меню"
    )
    purchase_date = models.DateTimeField(auto_now_add=True, verbose_name="Дата покупки")
    price_paid = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Оплаченная сумма",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='processing',
        verbose_name="Статус оплаты"
    )

    class Meta:
        verbose_name = "Покупка пользователя"
        verbose_name_plural = "Покупки пользователей"
        unique_together = ["user", "premium_meal_plan"]  # Одна покупка на меню
        ordering = ["-purchase_date"]

    def __str__(self):
        return f"{self.user.username} - {self.premium_meal_plan.name} ({self.get_status_display()})"