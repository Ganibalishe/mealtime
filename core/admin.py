from django.contrib import admin
from django.utils.html import format_html
from .models import (
    IngredientCategory,
    CookingMethod,
    Ingredient,
    Recipe,
    RecipeIngredient,
    MealPlan,
    RecipeMealPlan,
    ShoppingList,
    ShoppingListItem,
    ShoppingListTemplate,
    TemplateItem,
    Tag,
    PremiumMealPlan,
    PremiumMealPlanRecipe,
    UserPurchase,
)


# Inline для отображения ингредиентов рецепта прямо в форме рецепта
class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 3
    classes = ["collapse"]

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "ingredient":
            kwargs["queryset"] = Ingredient.objects.select_related("category")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


# Inline для отображения рецептов в плане питания
class RecipeMealPlanInline(admin.TabularInline):
    model = RecipeMealPlan
    extra = 2
    classes = ["collapse"]
    raw_id_fields = ["recipe"]


# Inline для отображения элементов списка покупок
class ShoppingListItemInline(admin.TabularInline):
    model = ShoppingListItem
    extra = 5
    classes = ["collapse"]
    readonly_fields = ["category"]
    raw_id_fields = ["ingredient"]

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "ingredient":
            kwargs["queryset"] = Ingredient.objects.select_related("category")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


# Inline для отображения элементов шаблона списка покупок
class TemplateItemInline(admin.TabularInline):
    model = TemplateItem
    extra = 5
    classes = ["collapse"]
    raw_id_fields = ["ingredient"]


# Inline для отображения рецептов в премиум меню
class PremiumMealPlanRecipeInline(admin.TabularInline):
    model = PremiumMealPlanRecipe
    extra = 3
    classes = ["collapse"]
    raw_id_fields = ["recipe"]
    ordering = ["day_number", "meal_type", "order"]

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "recipe":
            # Показываем только премиум рецепты для выбора
            kwargs["queryset"] = Recipe.objects.filter(is_premium=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


# Фильтры для админки
class CookingMethodFilter(admin.SimpleListFilter):
    title = "Способ приготовления"
    parameter_name = "cooking_method"

    def lookups(self, request, model_admin):
        methods = CookingMethod.objects.all()
        return [(method.id, method.name) for method in methods]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(cooking_method_id=self.value())
        return queryset


class ShoppingListStatusFilter(admin.SimpleListFilter):
    title = "Статус списка"
    parameter_name = "status"

    def lookups(self, request, model_admin):
        return ShoppingList.STATUS_CHOICES

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(status=self.value())
        return queryset


class PremiumMealPlanStatusFilter(admin.SimpleListFilter):
    title = "Статус меню"
    parameter_name = "status"

    def lookups(self, request, model_admin):
        return [
            ("active", "Активные"),
            ("inactive", "Неактивные"),
            ("free", "Бесплатные"),
            ("paid", "Платные"),
        ]

    def queryset(self, request, queryset):
        if self.value() == "active":
            return queryset.filter(is_active=True)
        elif self.value() == "inactive":
            return queryset.filter(is_active=False)
        elif self.value() == "free":
            return queryset.filter(is_free=True)
        elif self.value() == "paid":
            return queryset.filter(is_free=False)
        return queryset


# Модель админки для ShoppingList
@admin.register(ShoppingList)
class ShoppingListAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "user",
        "period_start",
        "period_end",
        "status",
        "total_items",
        "items_checked",
        "progress_display",
        "is_outdated",
        "created_at",
    ]
    list_filter = [
        ShoppingListStatusFilter,
        "period_start",
        "period_end",
        "is_outdated",
    ]
    search_fields = ["name", "user__username"]
    list_select_related = ["user"]
    inlines = [ShoppingListItemInline]
    readonly_fields = [
        "total_items",
        "items_checked",
        "created_at",
        "updated_at",
        "completed_at",
    ]
    date_hierarchy = "created_at"

    fieldsets = (
        (
            "Основная информация",
            {"fields": ("user", "name", "period_start", "period_end", "status")},
        ),
        (
            "Статистика",
            {
                "fields": ("total_items", "items_checked", "is_outdated"),
                "classes": ("collapse",),
            },
        ),
        (
            "Даты",
            {
                "fields": ("created_at", "updated_at", "completed_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def progress_display(self, obj):
        return f"{obj.get_progress()}%"

    progress_display.short_description = "Прогресс"

    def mark_as_completed(self, request, queryset):
        from django.utils import timezone

        updated = queryset.update(status="completed", completed_at=timezone.now())
        self.message_user(request, f"{updated} списков отмечены как завершенные")

    mark_as_completed.short_description = "Отметить как завершенные"

    def mark_as_active(self, request, queryset):
        updated = queryset.update(status="active", completed_at=None)
        self.message_user(request, f"{updated} списков отмечены как активные")

    mark_as_active.short_description = "Отметить как активные"

    actions = [mark_as_completed, mark_as_active]


# Модель админки для ShoppingListItem
@admin.register(ShoppingListItem)
class ShoppingListItemAdmin(admin.ModelAdmin):
    list_display = [
        "shopping_list",
        "ingredient",
        "quantity",
        "unit",
        "checked",
        "category",
        "order",
    ]
    list_filter = ["checked", "category", "unit"]
    list_editable = ["checked", "order"]
    search_fields = ["ingredient__name", "shopping_list__name"]
    list_select_related = ["shopping_list", "ingredient", "category"]
    raw_id_fields = ["shopping_list", "ingredient"]

    def mark_as_checked(self, request, queryset):
        updated = queryset.update(checked=True)
        self.message_user(request, f"{updated} элементов отмечены как купленные")

    mark_as_checked.short_description = "Отметить как купленные"

    def mark_as_unchecked(self, request, queryset):
        updated = queryset.update(checked=False)
        self.message_user(request, f"{updated} элементов отмечены как некупленные")

    mark_as_unchecked.short_description = "Отметить как некупленные"

    actions = [mark_as_checked, mark_as_unchecked]


# Модель админки для ShoppingListTemplate
@admin.register(ShoppingListTemplate)
class ShoppingListTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "is_default", "created_at"]
    list_filter = ["is_default"]
    search_fields = ["name", "user__username"]
    list_select_related = ["user"]
    inlines = [TemplateItemInline]

    def set_as_default(self, request, queryset):
        # Сначала сбросим все шаблоны по умолчанию
        ShoppingListTemplate.objects.filter(is_default=True).update(is_default=False)
        # Установим выбранные как default
        updated = queryset.update(is_default=True)
        self.message_user(
            request, f"{updated} шаблонов установлены как шаблоны по умолчанию"
        )

    set_as_default.short_description = "Установить как шаблон по умолчанию"

    actions = [set_as_default]


# Модель админки для TemplateItem
@admin.register(TemplateItem)
class TemplateItemAdmin(admin.ModelAdmin):
    list_display = ["template", "ingredient", "quantity", "unit", "order"]
    list_editable = ["quantity", "unit", "order"]
    list_filter = ["unit"]
    search_fields = ["template__name", "ingredient__name"]
    list_select_related = ["template", "ingredient"]
    raw_id_fields = ["template", "ingredient"]


# Существующие модели админки (остаются без изменений)
@admin.register(IngredientCategory)
class IngredientCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "order", "ingredient_count"]
    list_editable = ["order"]
    ordering = ["order", "name"]

    def ingredient_count(self, obj):
        return obj.ingredient_set.count()

    ingredient_count.short_description = "Количество ингредиентов"


@admin.register(CookingMethod)
class CookingMethodAdmin(admin.ModelAdmin):
    list_display = ["name", "recipe_count"]
    search_fields = ["name"]

    def recipe_count(self, obj):
        return obj.recipe_set.count()

    recipe_count.short_description = "Количество рецептов"


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "default_unit_display", "recipe_count"]
    list_filter = ["category", "default_unit"]
    search_fields = ["name"]
    list_select_related = ["category"]

    def default_unit_display(self, obj):
        return obj.get_default_unit_display()

    default_unit_display.short_description = "Единица измерения"

    def recipe_count(self, obj):
        return obj.recipeingredient_set.count()

    recipe_count.short_description = "Используется в рецептах"


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "color_preview", "recipe_count", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["name", "description"]
    readonly_fields = ["created_at", "color_preview"]
    fieldsets = (
        (None, {"fields": ("name", "color", "color_preview", "description")}),
        (
            "Системная информация",
            {"fields": ("created_at",), "classes": ("collapse",)},
        ),
    )

    def color_preview(self, obj):
        if obj.color:
            return format_html(
                '<div style="width: 20px; height: 20px; background-color: {}; border: 1px solid #ccc;"></div>',
                obj.color,
            )
        return "-"

    color_preview.short_description = "Цвет"

    def recipe_count(self, obj):
        return obj.recipe_set.count()

    recipe_count.short_description = "Количество рецептов"


# Фильтр по тегам для рецептов
class TagFilter(admin.SimpleListFilter):
    title = "Теги"
    parameter_name = "tags"

    def lookups(self, request, model_admin):
        tags = Tag.objects.all()
        return [(tag.id, tag.name) for tag in tags]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(tags__id=self.value())
        return queryset


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "cooking_time",
        "difficulty_display",
        "cooking_method",
        "is_premium",
        "premium_menus_count",
        "tags_display",
        "ingredient_count",
        "image_preview",
    ]
    list_filter = [
        CookingMethodFilter,
        "difficulty",
        "cooking_time",
        TagFilter,
        "is_premium",
    ]
    list_editable = ["is_premium"]
    search_fields = ["name", "description", "tags__name"]
    list_select_related = ["cooking_method"]
    inlines = [RecipeIngredientInline]
    readonly_fields = ["image_preview"]
    filter_horizontal = ["tags"]
    fieldsets = (
        (
            "Основная информация",
            {
                "fields": (
                    "name",
                    "description",
                    "image",
                    "image_preview",
                    "is_premium",
                )
            },
        ),
        (
            "Детали приготовления",
            {
                "fields": ("cooking_time", "difficulty", "cooking_method", "portions"),
                "classes": ("collapse",),
            },
        ),
        (
            "Теги",
            {
                "fields": ("tags",),
                "classes": ("collapse",),
            },
        ),
        ("Инструкции", {"fields": ("instructions",)}),
    )

    def difficulty_display(self, obj):
        return obj.get_difficulty_display()

    difficulty_display.short_description = "Сложность"

    def premium_menus_count(self, obj):
        return obj.premiummealplanrecipe_set.count()

    premium_menus_count.short_description = "В меню"

    def tags_display(self, obj):
        tags = obj.tags.all()[:3]  # Показываем первые 3 тега
        tag_list = []
        for tag in tags:
            color = tag.get_color_display()
            tag_list.append(
                format_html(
                    '<span style="background-color: {}; color: white; padding: 2px 6px; border-radius: 12px; font-size: 11px; margin: 1px;">{}</span>',
                    color,
                    tag.name,
                )
            )
        return format_html(" ".join(tag_list)) if tag_list else "-"

    tags_display.short_description = "Теги"

    def ingredient_count(self, obj):
        return obj.ingredients.count()

    ingredient_count.short_description = "Ингредиентов"

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="100" height="100" style="object-fit: cover;" />',
                obj.image.url,
            )
        return "Нет изображения"

    image_preview.short_description = "Превью"

    def mark_as_premium(self, request, queryset):
        updated = queryset.update(is_premium=True)
        self.message_user(request, f"{updated} рецептов отмечены как премиум")

    mark_as_premium.short_description = "Отметить как премиум рецепты"

    def mark_as_regular(self, request, queryset):
        updated = queryset.update(is_premium=False)
        self.message_user(request, f"{updated} рецептов отмечены как обычные")

    mark_as_regular.short_description = "Отметить как обычные рецепты"

    actions = [mark_as_premium, mark_as_regular]


@admin.register(RecipeIngredient)
class RecipeIngredientAdmin(admin.ModelAdmin):
    list_display = ["recipe", "ingredient", "quantity"]
    search_fields = ["recipe__name", "ingredient__name"]
    list_select_related = ["recipe", "ingredient"]


@admin.register(MealPlan)
class MealPlanAdmin(admin.ModelAdmin):
    list_display = ["user", "date", "meal_type_display", "recipes_count"]
    list_filter = ["date", "meal_type"]
    search_fields = ["user__username", "user__email"]
    list_select_related = ["user"]
    inlines = [RecipeMealPlanInline]
    date_hierarchy = "date"

    def meal_type_display(self, obj):
        return obj.get_meal_type_display()

    meal_type_display.short_description = "Прием пищи"

    def recipes_count(self, obj):
        return obj.recipes.count()

    recipes_count.short_description = "Количество рецептов"


@admin.register(RecipeMealPlan)
class RecipeMealPlanAdmin(admin.ModelAdmin):
    list_display = ["meal_plan", "recipe", "portions", "order"]
    list_editable = ["portions", "order"]
    list_filter = ["portions"]
    search_fields = ["meal_plan__user__username", "recipe__name"]
    list_select_related = ["meal_plan", "recipe"]
    raw_id_fields = ["meal_plan", "recipe"]


@admin.register(PremiumMealPlan)
class PremiumMealPlanAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "price_display",
        "is_free",
        "duration_days",
        "recipes_count",
        "purchases_count",
        "is_active",
        "created_at",
    ]
    list_filter = [
        PremiumMealPlanStatusFilter,
        "duration_days",
        "is_free",
        "is_active",
        "created_at",
    ]
    search_fields = ["name", "description"]
    list_editable = ["is_active"]
    inlines = [PremiumMealPlanRecipeInline]
    readonly_fields = ["created_at", "updated_at"]
    filter_horizontal = ["tags"]

    fieldsets = (
        (
            "Основная информация",
            {
                "fields": (
                    "name",
                    "description",
                    "price",
                    "is_free",
                    "duration_days",
                    "is_active",
                    "tags",
                )
            },
        ),
        (
            "Даты",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def price_display(self, obj):
        if obj.is_free:
            return "Бесплатно"
        return f"{obj.price} руб."

    price_display.short_description = "Стоимость"

    def recipes_count(self, obj):
        return obj.premium_recipes.count()

    recipes_count.short_description = "Рецептов"

    def recipes_count_display(self, obj):
        return self.recipes_count(obj)

    recipes_count_display.short_description = "Количество рецептов"

    def purchases_count(self, obj):
        return obj.userpurchase_set.count()

    purchases_count.short_description = "Покупок"

    def purchases_count_display(self, obj):
        return self.purchases_count(obj)

    purchases_count_display.short_description = "Количество покупок"

    def activate_menus(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} меню активированы")

    activate_menus.short_description = "Активировать выбранные меню"

    def deactivate_menus(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} меню деактивированы")

    deactivate_menus.short_description = "Деактивировать выбранные меню"

    actions = [activate_menus, deactivate_menus]


# Модель админки для PremiumMealPlanRecipe
@admin.register(PremiumMealPlanRecipe)
class PremiumMealPlanRecipeAdmin(admin.ModelAdmin):
    list_display = [
        "premium_meal_plan",
        "day_number",
        "meal_type_display",
        "recipe",
        "order",
    ]
    list_filter = ["day_number", "meal_type", "premium_meal_plan"]
    list_editable = ["day_number", "order"]
    search_fields = [
        "premium_meal_plan__name",
        "recipe__name",
    ]
    list_select_related = ["premium_meal_plan", "recipe"]
    raw_id_fields = ["premium_meal_plan", "recipe"]

    def meal_type_display(self, obj):
        return obj.get_meal_type_display()

    meal_type_display.short_description = "Прием пищи"


# Модель админки для UserPurchase
@admin.register(UserPurchase)
class UserPurchaseAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "premium_meal_plan",
        "price_paid_display",
        "purchase_date",
    ]
    list_filter = ["purchase_date", "premium_meal_plan"]
    search_fields = [
        "user__username",
        "user__email",
        "premium_meal_plan__name",
    ]
    list_select_related = ["user", "premium_meal_plan"]
    readonly_fields = ["purchase_date"]
    date_hierarchy = "purchase_date"

    def price_paid_display(self, obj):
        if obj.price_paid is None:
            return "Бесплатно"
        return f"{obj.price_paid} руб."

    price_paid_display.short_description = "Оплаченная сумма"

    fieldsets = (
        (
            "Основная информация",
            {
                "fields": (
                    "user",
                    "premium_meal_plan",
                    "price_paid",
                )
            },
        ),
        (
            "Системная информация",
            {
                "fields": ("purchase_date",),
                "classes": ("collapse",),
            },
        ),
    )
