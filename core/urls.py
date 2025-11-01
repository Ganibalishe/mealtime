from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .api import *

router = DefaultRouter()

router.register(r"ingredient-categories", IngredientCategoryViewSet)
router.register(r"cooking-methods", CookingMethodViewSet)
router.register(r"ingredients", IngredientViewSet)
router.register(r"recipes", RecipeViewSet)
router.register(r"meal-plans", MealPlanViewSet)
router.register(r"shopping-lists", ShoppingListViewSet)
router.register(r"shopping-list-items", ShoppingListItemViewSet)
router.register(r"shopping-templates", ShoppingListTemplateViewSet)
router.register(r"tags", TagViewSet)
router.register(
    r"premium-meal-plans", PremiumMealPlanViewSet, basename="premium-meal-plan"
)
router.register(r"user-purchases", UserPurchaseViewSet, basename="user-purchase")

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/register/", register_user, name="register"),
    path(
        "api/premium-meal-plans/create-meal-plan/",
        PremiumMealPlanViewSet.as_view({"post": "create_meal_plan"}),
        name="premium-create-meal-plan",
    ),
    path('api/premium-meal-plans/<uuid:pk>/create_meal_plan_from_date/',
         PremiumMealPlanViewSet.as_view({'post': 'create_meal_plan_from_date'}),
         name='premium-create-meal-plan-from-date'),
]
