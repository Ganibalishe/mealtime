from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from .models import *
from .serializers import *
from .services import activate_premium_menu_for_user, create_meal_plan_from_premium
from .shopping_list_manager import (
    get_or_create_shopping_list,
    archive_old_shopping_lists,
)
from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny


@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    try:
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"error": "Необходимо указать имя пользователя и пароль"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Пользователь с таким именем уже существует"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=username, email=email, password=password
        )

        return Response(
            {"message": "Пользователь успешно создан", "user_id": user.id},
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        return Response(
            {"error": f"Ошибка при создании пользователя: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


# Базовые ViewSets
class IngredientCategoryViewSet(viewsets.ModelViewSet):
    queryset = IngredientCategory.objects.all()
    serializer_class = IngredientCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class CookingMethodViewSet(viewsets.ModelViewSet):
    queryset = CookingMethod.objects.all()
    serializer_class = CookingMethodSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.select_related("category")
    serializer_class = IngredientSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["category"]
    search_fields = ["name"]


# Рецепты
class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all()
    serializer_class = RecipeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["cooking_method", "difficulty", "tags"]
    search_fields = ["name", "description", "ingredients__ingredient__name"]
    ordering_fields = ["name", "cooking_time", "difficulty"]
    ordering = ["name"]

    def get_queryset(self):
        """
        Возвращает рецепты с учетом премиум доступа
        """
        queryset = Recipe.objects.prefetch_related(
            "ingredients__ingredient", "tags", "cooking_method"
        )
        if not self.request.user.is_authenticated:
            return queryset.filter(is_premium=False).order_by("name")

        user = self.request.user
        purchased_premium_recipe_ids = self._get_purchased_premium_recipe_ids(user)

        from django.db.models import Q

        final_queryset = queryset.filter(
            Q(is_premium=False) | Q(id__in=purchased_premium_recipe_ids)
        )

        return final_queryset

    def _get_purchased_premium_recipe_ids(self, user):
        """
        Возвращает ID всех премиум рецептов из меню, купленных пользователем
        """
        if not user.is_authenticated:
            return []

        # Более эффективный запрос с использованием exists и подзапроса
        from django.db.models import Exists, OuterRef
        from .models import PremiumMealPlanRecipe, UserPurchase

        # Получаем все премиум рецепты из купленных меню пользователя
        purchased_recipe_ids = (
            PremiumMealPlanRecipe.objects.filter(
                premium_meal_plan__userpurchase__user=user
            )
            .values_list("recipe_id", flat=True)
            .distinct()
        )

        return list(purchased_recipe_ids)

    def get_serializer_context(self):
        """Добавляем информацию о доступе к рецепту в контекст"""
        context = super().get_serializer_context()
        context["user_has_access"] = self._get_user_access_info()
        return context

    def _get_user_access_info(self):
        """Возвращает информацию о доступе пользователя к рецептам"""
        if not self.request.user.is_authenticated:
            return {"has_premium_access": False, "purchased_menus": []}

        user = self.request.user
        purchased_menus = UserPurchase.objects.filter(user=user).select_related(
            "premium_meal_plan"
        )

        return {
            "has_premium_access": purchased_menus.exists(),
            "purchased_menus": [
                purchase.premium_meal_plan_id for purchase in purchased_menus
            ],
        }

    @action(detail=False, methods=["get"])
    def filters(self, request):
        """Получить доступные фильтры для рецептов с учетом премиум доступа"""
        response_data = {
            "cooking_methods": CookingMethodSerializer(
                CookingMethod.objects.all(), many=True
            ).data,
            "difficulty_levels": Recipe.DIFFICULTY_LEVELS,
            "tags": TagSerializer(Tag.objects.all(), many=True).data,
        }

        # Добавляем информацию о премиум доступе
        access_info = self._get_user_access_info()
        response_data["user_access"] = access_info

        return Response(response_data)

    @action(detail=False, methods=["get"])
    def search(self, request):
        """Расширенный поиск рецептов с учетом премиум доступа"""
        search_query = request.query_params.get("q", "")
        cooking_method = request.query_params.get("cooking_method")
        difficulty = request.query_params.get("difficulty")
        max_time = request.query_params.get("max_time")
        tags = request.query_params.getlist("tags")

        # Используем основной queryset с учетом премиум доступа
        queryset = self.get_queryset()

        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query)
                | Q(description__icontains=search_query)
                | Q(ingredients__ingredient__name__icontains=search_query)
            ).distinct()

        if cooking_method:
            queryset = queryset.filter(cooking_method_id=cooking_method)

        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        if max_time:
            queryset = queryset.filter(cooking_time__lte=max_time)

        if tags:
            for tag_id in tags:
                queryset = queryset.filter(tags__id=tag_id)
            queryset = queryset.distinct()

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def access_info(self, request, pk=None):
        """
        Получить информацию о доступе к конкретному рецепту
        """
        recipe = self.get_object()
        user = request.user

        access_info = {
            "recipe_id": recipe.id,
            "recipe_name": recipe.name,
            "is_premium": recipe.is_premium,
            "user_has_access": False,
            "accessible_through_menus": [],
        }

        if recipe.is_premium:
            if user.is_authenticated:
                # Проверяем, в каких купленных меню есть этот рецепт
                from .models import PremiumMealPlanRecipe

                accessible_menus = PremiumMealPlanRecipe.objects.filter(
                    recipe=recipe, premium_meal_plan__userpurchase__user=user
                ).select_related("premium_meal_plan")

                if accessible_menus.exists():
                    access_info["user_has_access"] = True
                    access_info["accessible_through_menus"] = [
                        {
                            "menu_id": menu.premium_meal_plan.id,
                            "menu_name": menu.premium_meal_plan.name,
                        }
                        for menu in accessible_menus
                    ]
            else:
                access_info["user_has_access"] = False
        else:
            access_info["user_has_access"] = True

        return Response(access_info)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [SearchFilter]
    search_fields = ["name"]

    @action(detail=False, methods=["get"])
    def popular(self, request):
        """Получить популярные теги"""
        popular_tags = Tag.objects.annotate(recipe_count=Count("recipe")).order_by(
            "-recipe_count"
        )[:10]
        serializer = self.get_serializer(popular_tags, many=True)
        return Response(serializer.data)


# Планы питания
class MealPlanViewSet(viewsets.ModelViewSet):
    queryset = MealPlan.objects.all()
    serializer_class = MealPlanSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["date", "meal_type"]
    ordering_fields = ["date", "meal_type"]
    ordering = ["date", "meal_type"]

    def get_queryset(self):
        return MealPlan.objects.filter(user=self.request.user).prefetch_related(
            "recipes__recipe"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def range(self, request):
        """Получить планы питания за период"""
        start_date = request.query_params.get("start")
        end_date = request.query_params.get("end")

        if not start_date or not end_date:
            return Response(
                {"error": "Необходимо указать start и end даты"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.get_queryset().filter(date__gte=start_date, date__lte=end_date)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_recipe(self, request, pk=None):
        """Добавить рецепт в план питания"""
        meal_plan = self.get_object()
        recipe_id = request.data.get("recipe_id")
        portions = request.data.get("portions", 2)

        if not recipe_id:
            return Response(
                {"error": "Необходимо указать recipe_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            recipe = Recipe.objects.get(id=recipe_id)
            recipe_meal_plan = RecipeMealPlan.objects.create(
                meal_plan=meal_plan, recipe=recipe, portions=portions
            )
            serializer = RecipeMealPlanSerializer(recipe_meal_plan)
            return Response(serializer.data)
        except Recipe.DoesNotExist:
            return Response(
                {"error": "Рецепт не найден"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["delete"])
    def remove_recipe(self, request, pk=None):
        """Удалить рецепт из плана питания"""
        meal_plan = self.get_object()
        recipe_meal_plan_id = request.data.get("recipe_meal_plan_id")

        if not recipe_meal_plan_id:
            return Response(
                {"error": "Необходимо указать recipe_meal_plan_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            recipe_meal_plan = RecipeMealPlan.objects.get(
                id=recipe_meal_plan_id, meal_plan=meal_plan
            )
            recipe_meal_plan.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except RecipeMealPlan.DoesNotExist:
            return Response(
                {"error": "Рецепт не найден в плане питания"},
                status=status.HTTP_404_NOT_FOUND,
            )


# Списки покупок
class ShoppingListViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = ShoppingList.objects.all()

    def get_queryset(self):
        return ShoppingList.objects.filter(user=self.request.user).prefetch_related(
            "items__ingredient"
        )

    def get_serializer_class(self):
        if self.action == "create":
            return ShoppingListCreateSerializer
        return ShoppingListSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """Умная генерация списка покупок с проверкой актуальности"""
        start_date = request.data.get("start_date")
        end_date = request.data.get("end_date")
        list_name = request.data.get("name")

        if not start_date or not end_date:
            return Response(
                {"error": "Необходимо указать start_date и end_date"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            shopping_list, action = get_or_create_shopping_list(
                user=request.user,
                start_date=start_date,
                end_date=end_date,
                list_name=list_name,
            )
            if not shopping_list:
                return Response(
                    {"error": "Нет данных для генерации списка покупок"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Архивируем старые списки за этот период
            archive_old_shopping_lists(request.user, start_date, end_date)

            # Возвращаем результат с информацией о действии
            from .serializers import ShoppingListSerializer

            serializer = ShoppingListSerializer(shopping_list)

            response_data = serializer.data
            response_data["action"] = action
            response_data["message"] = self.get_action_message(action)

            # Добавляем статистику
            response_data["statistics"] = {
                "total_ingredients": shopping_list.total_items,
                "period_days": (
                    shopping_list.period_end - shopping_list.period_start
                ).days
                + 1,
            }

            return Response(response_data)

        except Exception as e:
            return Response(
                {"error": f"Ошибка при генерации списка: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def get_action_message(self, action):
        messages = {
            "created": "Список покупок успешно создан",
            "exists": "Используется существующий актуальный список",
            "updated": "Список покупок обновлен по актуальным данным",
        }
        return messages.get(action, "")

    @action(detail=True, methods=["post"])
    def refresh(self, request, pk=None):
        """Перегенерировать список покупок"""
        shopping_list = self.get_object()
        # TODO: Реализовать логику перегенерации
        return Response({"message": "Функция в разработке"})

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Отметить список как завершенный"""
        shopping_list = self.get_object()
        shopping_list.status = "completed"
        shopping_list.completed_at = timezone.now()
        shopping_list.save()
        serializer = self.get_serializer(shopping_list)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def history(self, request):
        """Получить историю списков покупок"""
        days = int(request.query_params.get("days", 30))

        from .shopping_list_manager import get_shopping_list_history

        history_lists = get_shopping_list_history(request.user, days)

        from .serializers import ShoppingListSerializer

        serializer = ShoppingListSerializer(history_lists, many=True)

        return Response(
            {
                "period_days": days,
                "total_lists": len(history_lists),
                "lists": serializer.data,
            }
        )

    @action(detail=True, methods=["get"])
    def compare(self, request, pk=None):
        """Сравнить текущий список с другим"""
        other_list_id = request.query_params.get("with")
        if not other_list_id:
            return Response(
                {"error": "Необходимо указать ID списка для сравнения (параметр with)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .shopping_list_manager import compare_shopping_lists

        differences = compare_shopping_lists(pk, other_list_id)

        return Response(
            {
                "list1_id": pk,
                "list2_id": other_list_id,
                "differences": differences,
                "total_differences": len(differences),
            }
        )

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Создать копию списка покупок"""
        original_list = self.get_object()

        # Создаем копию списка
        new_list = ShoppingList.objects.create(
            user=request.user,
            name=f"{original_list.name} (копия)",
            period_start=original_list.period_start,
            period_end=original_list.period_end,
            status="draft",
        )

        # Копируем элементы
        for item in original_list.items.all():
            ShoppingListItem.objects.create(
                shopping_list=new_list,
                ingredient=item.ingredient,
                quantity=item.quantity,
                unit=item.unit,
                category=item.category,
                order=item.order,
                checked=False,  # Сбрасываем статус покупки
            )

        from .serializers import ShoppingListSerializer

        serializer = ShoppingListSerializer(new_list)

        return Response(
            {"message": "Список успешно скопирован", "shopping_list": serializer.data}
        )


class ShoppingListItemViewSet(viewsets.ModelViewSet):
    serializer_class = ShoppingListItemSerializer
    permission_classes = [IsAuthenticated]
    queryset = ShoppingListItem.objects.all()

    def get_queryset(self):
        return ShoppingListItem.objects.filter(
            shopping_list__user=self.request.user
        ).select_related("ingredient", "category")

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        """Переключить статус checked с обновлением счетчиков списка"""
        item = self.get_object()
        item.checked = not item.checked
        item.save()

        # Получаем родительский список покупок
        shopping_list = item.shopping_list

        # Пересчитываем счетчики
        total_items = shopping_list.items.count()
        items_checked = shopping_list.items.filter(checked=True).count()

        # Обновляем поля списка
        shopping_list.total_items = total_items
        shopping_list.items_checked = items_checked

        # Пересчитываем прогресс
        if total_items > 0:
            shopping_list.progress = (items_checked / total_items) * 100
        else:
            shopping_list.progress = 0

        shopping_list.save()

        serializer = self.get_serializer(item)
        return Response(serializer.data)


# Шаблоны списков покупок
class ShoppingListTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = ShoppingListTemplateSerializer
    permission_classes = [IsAuthenticated]
    queryset = ShoppingListTemplate.objects.all()

    def get_queryset(self):
        return ShoppingListTemplate.objects.filter(
            user=self.request.user
        ).prefetch_related("items__ingredient")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PremiumMealPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для работы с премиум меню
    """

    queryset = PremiumMealPlan.objects.filter(is_active=True).prefetch_related(
        "premium_recipes__recipe", "tags"
    )
    permission_classes = [permissions.AllowAny]  # Разрешаем доступ без авторизации

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PremiumMealPlanDetailSerializer
        return PremiumMealPlanSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @action(detail=True, methods=["post"])
    def create_meal_plan_from_date(self, request, pk=None):
        """
        Создать план питания из премиум меню начиная с указанной даты
        """
        if not request.user.is_authenticated:
            return Response(
                {"error": "Требуется авторизация"}, status=status.HTTP_401_UNAUTHORIZED
            )

        premium_meal_plan = self.get_object()

        # Проверяем, что меню куплено
        if not UserPurchase.objects.filter(
            user=request.user, premium_meal_plan=premium_meal_plan
        ).exists():
            return Response(
                {"error": "Это меню не активировано"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Валидация даты
        start_date = request.data.get("start_date")
        if not start_date:
            return Response(
                {"error": "Необходимо указать start_date"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Валидация количества порций
        portions = request.data.get("portions", 2)  # Значение по умолчанию 2
        try:
            portions = int(portions)
            if portions < 1 or portions > 20:
                return Response(
                    {"error": "Количество порций должно быть от 1 до 20"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (TypeError, ValueError):
            return Response(
                {"error": "Количество порций должно быть числом"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from datetime import datetime

            # Проверяем что дата валидна
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            return Response(
                {"error": "Неверный формат даты. Используйте YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            created_plans = create_meal_plan_from_premium(
                request.user,
                premium_meal_plan,
                start_date,
                portions,  # Передаем количество порций
            )

            return Response(
                {
                    "message": f"План питания успешно создан на {len(created_plans)} дней",
                    "start_date": start_date,
                    "portions": portions,
                    "created_plans_count": len(created_plans),
                    "premium_meal_plan": premium_meal_plan.name,
                    "created_dates": [plan.date.isoformat() for plan in created_plans],
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response(
                {"error": f"Ошибка при создании плана питания: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def my_purchases(self, request):
        """
        Получить купленные меню текущего пользователя
        """
        if not request.user.is_authenticated:
            return Response(
                {"error": "Требуется авторизация"}, status=status.HTTP_401_UNAUTHORIZED
            )

        purchases = UserPurchase.objects.filter(user=request.user).select_related(
            "premium_meal_plan"
        )
        serializer = UserPurchaseSerializer(purchases, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """
        Активировать премиум меню для текущего пользователя
        """
        if not request.user.is_authenticated:
            return Response(
                {"error": "Требуется авторизация"}, status=status.HTTP_401_UNAUTHORIZED
            )

        premium_meal_plan = self.get_object()

        # Проверяем, не куплено ли уже это меню
        if UserPurchase.objects.filter(
            user=request.user, premium_meal_plan=premium_meal_plan
        ).exists():
            return Response(
                {"error": "Это меню уже активировано"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            purchase, created = activate_premium_menu_for_user(
                request.user, premium_meal_plan
            )
            serializer = UserPurchaseSerializer(purchase)

            return Response(
                {"message": "Меню успешно активировано", "purchase": serializer.data},
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response(
                {"error": f"Ошибка при активации меню: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"])
    def create_meal_plan(self, request):
        """
        Создать план питания из премиум меню начиная с указанной даты
        """
        if not request.user.is_authenticated:
            return Response(
                {"error": "Требуется авторизация"}, status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = CreateMealPlanFromPremiumSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        premium_meal_plan_id = serializer.validated_data["premium_meal_plan_id"]
        start_date = serializer.validated_data["start_date"]

        try:
            # Проверяем, что меню куплено
            if not UserPurchase.objects.filter(
                user=request.user, premium_meal_plan_id=premium_meal_plan_id
            ).exists():
                return Response(
                    {"error": "Это меню не активировано"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            premium_meal_plan = PremiumMealPlan.objects.get(id=premium_meal_plan_id)
            created_plans = create_meal_plan_from_premium(
                request.user, premium_meal_plan, start_date
            )

            return Response(
                {
                    "message": f"План питания успешно создан на {len(created_plans)} дней",
                    "start_date": start_date,
                    "created_plans_count": len(created_plans),
                    "premium_meal_plan": premium_meal_plan.name,
                },
                status=status.HTTP_201_CREATED,
            )

        except PremiumMealPlan.DoesNotExist:
            return Response(
                {"error": "Премиум меню не найдено"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Ошибка при создании плана питания: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class UserPurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для просмотра покупок пользователя
    """

    serializer_class = UserPurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserPurchase.objects.filter(user=self.request.user).select_related(
            "premium_meal_plan"
        )
