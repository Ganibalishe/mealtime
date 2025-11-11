from rest_framework import serializers
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
    UserPurchase,
    PremiumMealPlanRecipe,
    PremiumMealPlan,
)
from django.contrib.auth.models import User
from decimal import Decimal


class FormattedDecimalField(serializers.DecimalField):
    """Кастомное поле для отображения decimal без лишних нулей"""

    def to_representation(self, value):
        representation = super().to_representation(value)

        if representation is None:
            return representation

        try:
            decimal_value = Decimal(str(representation))
            # Проверяем, является ли число целым
            if decimal_value == decimal_value.to_integral_value():
                return int(decimal_value)
            else:
                # Убираем лишние нули в конце
                return (
                    representation.rstrip("0").rstrip(".")
                    if "." in representation
                    else representation
                )
        except (ValueError, TypeError):
            return representation


# Базовые сериализаторы
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]


class IngredientCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IngredientCategory
        fields = "__all__"


class CookingMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = CookingMethod
        fields = "__all__"


class IngredientSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    default_unit_display = serializers.CharField(
        source="get_default_unit_display", read_only=True
    )

    class Meta:
        model = Ingredient
        fields = [
            "id",
            "name",
            "category",
            "category_name",
            "default_unit",
            "default_unit_display",
        ]


# Рецепты
class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    unit = serializers.CharField(source="ingredient.default_unit", read_only=True)
    unit_display = serializers.CharField(
        source="ingredient.get_default_unit_display", read_only=True
    )
    quantity = FormattedDecimalField(max_digits=10, decimal_places=2)

    class Meta:
        model = RecipeIngredient
        fields = [
            "id",
            "ingredient",
            "ingredient_name",
            "quantity",
            "unit",
            "unit_display",
        ]


# Планы питания
class RecipeMealPlanSerializer(serializers.ModelSerializer):
    recipe_name = serializers.CharField(source="recipe.name", read_only=True)
    recipe_cooking_time = serializers.IntegerField(
        source="recipe.cooking_time", read_only=True
    )

    class Meta:
        model = RecipeMealPlan
        fields = [
            "id",
            "recipe",
            "recipe_name",
            "recipe_cooking_time",
            "portions",
            "order",
        ]


class MealPlanSerializer(serializers.ModelSerializer):
    recipes = RecipeMealPlanSerializer(many=True, read_only=True)
    meal_type_display = serializers.CharField(
        source="get_meal_type_display", read_only=True
    )

    class Meta:
        model = MealPlan
        fields = ["id", "user", "date", "meal_type", "meal_type_display", "recipes"]
        read_only_fields = ["user"]


# Списки покупок
class ShoppingListItemSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    unit = serializers.CharField(source="get_unit", read_only=True)
    unit_display = serializers.CharField(source="get_unit_display", read_only=True)
    quantity = FormattedDecimalField(max_digits=10, decimal_places=2)

    class Meta:
        model = ShoppingListItem
        fields = [
            "id",
            "ingredient",
            "ingredient_name",
            "quantity",
            "unit",
            "unit_display",
            "checked",
            "category",
            "category_name",
            "custom_name",
            "notes",
            "order",
        ]


class ShoppingListSerializer(serializers.ModelSerializer):
    items = ShoppingListItemSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = ShoppingList
        fields = [
            "id",
            "user",
            "name",
            "period_start",
            "period_end",
            "status",
            "total_items",
            "items_checked",
            "progress",
            "is_outdated",
            "created_at",
            "updated_at",
            "items",
        ]
        read_only_fields = [
            "user",
            "total_items",
            "items_checked",
            "created_at",
            "updated_at",
        ]

    def get_progress(self, obj):
        return obj.get_progress()


class ShoppingListCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShoppingList
        fields = ["name", "period_start", "period_end"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


# Шаблоны списков покупок
class TemplateItemSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    unit = serializers.CharField(source="ingredient.default_unit", read_only=True)
    unit_display = serializers.CharField(
        source="ingredient.get_default_unit_display", read_only=True
    )
    quantity = FormattedDecimalField(max_digits=10, decimal_places=2)

    class Meta:
        model = TemplateItem
        fields = [
            "id",
            "ingredient",
            "ingredient_name",
            "quantity",
            "unit",
            "unit_display",
            "order",
        ]


class ShoppingListTemplateSerializer(serializers.ModelSerializer):
    items = TemplateItemSerializer(many=True, read_only=True)

    class Meta:
        model = ShoppingListTemplate
        fields = [
            "id",
            "user",
            "name",
            "description",
            "is_default",
            "created_at",
            "items",
        ]
        read_only_fields = ["user", "created_at"]


# Фильтры для рецептов
class RecipeFilterSerializer(serializers.Serializer):
    cooking_method = serializers.CharField(required=False)
    difficulty = serializers.CharField(required=False)
    max_cooking_time = serializers.IntegerField(required=False)
    search = serializers.CharField(required=False)


class ShoppingListWithStatsSerializer(ShoppingListSerializer):
    statistics = serializers.SerializerMethodField()

    class Meta(ShoppingListSerializer.Meta):
        fields = ShoppingListSerializer.Meta.fields + ["statistics"]

    def get_statistics(self, obj):
        return {
            "total_items": obj.total_items,
            "items_checked": obj.items_checked,
            "progress": obj.get_progress(),
            "is_outdated": obj.is_outdated,
        }


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "color", "description"]


class RecipeSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        source="tags",
        write_only=True,
        required=False,
    )
    ingredients = RecipeIngredientSerializer(many=True, read_only=True)
    cooking_method_name = serializers.CharField(
        source="cooking_method.name", read_only=True
    )
    difficulty_display = serializers.CharField(
        source="get_difficulty_display", read_only=True
    )
    # Добавляем поле для информации о доступе
    user_has_access = serializers.SerializerMethodField()
    accessible_through_menus = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = [
            "id",
            "name",
            "description",
            "cooking_time",
            "difficulty",
            "difficulty_display",
            "cooking_method",
            "cooking_method_name",
            "tags",
            "tag_ids",
            "instructions",
            "image",
            "portions",
            "ingredients",
            "is_premium",
            "user_has_access",
            "accessible_through_menus",
        ]

    def get_user_has_access(self, obj):
        """Определяет, есть ли у пользователя доступ к рецепту"""
        request = self.context.get('request')
        if not request:
            return not obj.is_premium

        user = request.user

        # Бесплатные рецепты доступны всем
        if not obj.is_premium:
            return True

        # Премиум рецепты доступны только авторизованным пользователям с доступом
        if user.is_authenticated:
            # Проверяем, есть ли рецепт в купленных меню пользователя
            from core.models import PremiumMealPlanRecipe
            return PremiumMealPlanRecipe.objects.filter(
                recipe=obj,
                premium_meal_plan__userpurchase__user=user
            ).exists()

        return False

    def get_accessible_through_menus(self, obj):
        """Возвращает список меню, через которые доступен рецепт"""
        request = self.context.get('request')
        if not request or not obj.is_premium:
            return []

        user = request.user
        if not user.is_authenticated:
            return []

        from core.models import PremiumMealPlanRecipe
        accessible_menus = PremiumMealPlanRecipe.objects.filter(
            recipe=obj,
            premium_meal_plan__userpurchase__user=user
        ).select_related('premium_meal_plan')[:5]  # Ограничиваем количество

        return [
            {
                'menu_id': menu.premium_meal_plan.id,
                'menu_name': menu.premium_meal_plan.name
            }
            for menu in accessible_menus
        ]

    def get_purchase_check(self, obj):
        """Проверка доступа через покупки"""
        if not obj.is_premium:
            return "Free recipe - always accessible"

        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return "Premium recipe - no access (not authenticated)"

        from core.models import PremiumMealPlanRecipe, UserPurchase
        user = request.user

        # Проверяем доступ через покупки
        has_access = PremiumMealPlanRecipe.objects.filter(
            recipe=obj,
            premium_meal_plan__userpurchase__user=user
        ).exists()

        if has_access:
            # Получаем информацию о меню, через которые доступен
            menus = PremiumMealPlanRecipe.objects.filter(
                recipe=obj,
                premium_meal_plan__userpurchase__user=user
            ).select_related('premium_meal_plan')[:3]

            menu_info = [{
                'menu_id': str(menu.premium_meal_plan.id),
                'menu_name': menu.premium_meal_plan.name
            } for menu in menus]

            return f"Premium recipe - ACCESS GRANTED through menus: {menu_info}"
        else:
            return "Premium recipe - NO ACCESS (not purchased)"

    def create(self, validated_data):
        tags_data = validated_data.pop("tags", [])
        recipe = Recipe.objects.create(**validated_data)
        recipe.tags.set(tags_data)
        return recipe

    def update(self, instance, validated_data):
        tags_data = validated_data.pop("tags", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tags_data is not None:
            instance.tags.set(tags_data)

        return instance


class PremiumMealPlanRecipeSerializer(serializers.ModelSerializer):
    recipe_name = serializers.CharField(source="recipe.name", read_only=True)
    recipe_image = serializers.ImageField(source="recipe.image", read_only=True)
    recipe_cooking_time = serializers.IntegerField(
        source="recipe.cooking_time", read_only=True
    )
    meal_type_display = serializers.CharField(
        source="get_meal_type_display", read_only=True
    )

    class Meta:
        model = PremiumMealPlanRecipe
        fields = [
            "id",
            "day_number",
            "meal_type",
            "meal_type_display",
            "recipe",
            "recipe_name",
            "recipe_image",
            "recipe_cooking_time",
            "order",
        ]


class PremiumMealPlanSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    premium_recipes = PremiumMealPlanRecipeSerializer(many=True, read_only=True)
    is_purchased = serializers.SerializerMethodField()
    purchase_status = serializers.SerializerMethodField()  # Новое поле
    recipes_count = serializers.SerializerMethodField()

    class Meta:
        model = PremiumMealPlan
        fields = [
            "id",
            "name",
            "description",
            "price",
            "is_free",
            "duration_days",
            "is_active",
            "tags",
            "premium_recipes",
            "is_purchased",
            "purchase_status",  # Добавляем новое поле
            "recipes_count",
            "created_at",
        ]

    def get_is_purchased(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            purchase = UserPurchase.objects.filter(
                user=request.user, premium_meal_plan=obj
            ).first()
            return purchase and purchase.status == 'paid'
        return False

    def get_purchase_status(self, obj):
        """Возвращает статус покупки для текущего пользователя"""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            purchase = UserPurchase.objects.filter(
                user=request.user, premium_meal_plan=obj
            ).first()
            return purchase.status if purchase else None
        return None

    def get_recipes_count(self, obj):
        return obj.premium_recipes.count()


class PremiumMealPlanDetailSerializer(PremiumMealPlanSerializer):
    """Расширенный сериализатор для детальной страницы"""

    class Meta(PremiumMealPlanSerializer.Meta):
        fields = PremiumMealPlanSerializer.Meta.fields + [
            # Можно добавить дополнительные поля для детальной страницы
        ]


class UserPurchaseSerializer(serializers.ModelSerializer):
    premium_meal_plan_name = serializers.CharField(
        source="premium_meal_plan.name", read_only=True
    )

    class Meta:
        model = UserPurchase
        fields = [
            "id",
            "user",
            "premium_meal_plan",
            "premium_meal_plan_name",
            "purchase_date",
            "price_paid",
        ]
        read_only_fields = ["user", "purchase_date"]


class ActivatePremiumMenuSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=True)


class CreateMealPlanFromPremiumSerializer(serializers.Serializer):
    premium_meal_plan_id = serializers.UUIDField(required=True)
    start_date = serializers.DateField(required=True)

class CreateMealPlanFromDateSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=True)

    def validate_start_date(self, value):
        """
        Проверяем что дата не в прошлом
        """
        from datetime import date
        if value < date.today():
            raise serializers.ValidationError("Дата не может быть в прошлом")
        return value