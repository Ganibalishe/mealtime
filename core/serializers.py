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
)
from django.contrib.auth.models import User


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
    # Берем unit из ингредиента, а не из рецепта
    unit = serializers.CharField(source="ingredient.default_unit", read_only=True)
    unit_display = serializers.CharField(
        source="ingredient.get_default_unit_display", read_only=True
    )

    class Meta:
        model = RecipeIngredient
        fields = [
            "id",
            "ingredient",
            "ingredient_name",
            "quantity",
            "unit",
            "unit_display",  # Теперь unit берется из ингредиента
        ]


class RecipeSerializer(serializers.ModelSerializer):
    ingredients = RecipeIngredientSerializer(many=True, read_only=True)
    cooking_method_name = serializers.CharField(
        source="cooking_method.name", read_only=True
    )
    difficulty_display = serializers.CharField(
        source="get_difficulty_display", read_only=True
    )

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
            "instructions",
            "image",
            "portions",
            "ingredients",
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
    # Используем методы модели вместо прямого доступа к полям
    unit = serializers.CharField(source="get_unit", read_only=True)
    unit_display = serializers.CharField(source="get_unit_display", read_only=True)

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
    # Берем unit из ингредиента
    unit = serializers.CharField(source="ingredient.default_unit", read_only=True)
    unit_display = serializers.CharField(
        source="ingredient.get_default_unit_display", read_only=True
    )

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
    """Сериализатор для фильтров рецептов"""

    cooking_method = serializers.CharField(required=False)
    difficulty = serializers.CharField(required=False)
    max_cooking_time = serializers.IntegerField(required=False)
    search = serializers.CharField(required=False)


class ShoppingListWithStatsSerializer(ShoppingListSerializer):
    """Сериализатор списка покупок со статистикой"""

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
    # ДОБАВЛЕНО: поле тегов
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        source="tags",
        write_only=True,
        required=False,
    )

    # остальные поля остаются без изменений
    ingredients = RecipeIngredientSerializer(many=True, read_only=True)
    cooking_method_name = serializers.CharField(
        source="cooking_method.name", read_only=True
    )
    difficulty_display = serializers.CharField(
        source="get_difficulty_display", read_only=True
    )

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
            "tag_ids",  # ДОБАВЛЕНО
            "instructions",
            "image",
            "portions",
            "ingredients",
        ]

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
