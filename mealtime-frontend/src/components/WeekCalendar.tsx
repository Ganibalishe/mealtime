import React from 'react';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { MealPlan } from '../types';
import { useMealPlanStore } from '../stores/mealPlanStore';

interface WeekCalendarProps {
  currentDate: Date;
  mealPlans: MealPlan[];
  onDateSelect: (date: string) => void;
  onAddMeal: (date: string, mealType: string) => void;
  selectedDays: string[];
}

const WeekCalendar: React.FC<WeekCalendarProps> = ({
  currentDate,
  mealPlans,
  onDateSelect,
  onAddMeal,
  selectedDays
}) => {
  const { removeRecipeFromMealPlan } = useMealPlanStore();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const mealTypes = [
    { type: 'breakfast', label: 'Завтрак', emoji: '☀️' },
    { type: 'lunch', label: 'Обед', emoji: '🍽️' },
    { type: 'dinner', label: 'Ужин', emoji: '🌙' },
  ];

  const formatDateToLocal = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  const getMealPlansForDate = (date: string) => {
    return mealPlans.filter(plan => plan.date === date);
  };

  const getRecipesForMeal = (date: string, mealType: string) => {
    const plans = getMealPlansForDate(date);
    const mealPlan = plans.find(plan => plan.meal_type === mealType);
    return {
      mealPlan,
      recipes: mealPlan?.recipes || []
    };
  };

  const handleRemoveRecipe = async (mealPlanId: string, recipeMealPlanId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Предотвращаем всплытие, чтобы не открывать модальное окно

    if (window.confirm('Вы уверены, что хотите удалить этот рецепт из плана питания?')) {
      try {
        await removeRecipeFromMealPlan(mealPlanId, recipeMealPlanId);
      } catch (error) {
        console.error('Error removing recipe:', error);
        alert('Ошибка при удалении рецепта');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Заголовок недели */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Неделя {format(weekStart, 'd MMMM', { locale: ru })} - {format(addDays(weekStart, 6), 'd MMMM', { locale: ru })}
        </h3>
      </div>

      {/* Дни недели */}
      <div className="overflow-x-auto">
        <div className="min-w-full" style={{ minWidth: '800px' }}>
          {/* Заголовки дней */}
          <div className="grid grid-cols-8 gap-px bg-gray-200">
            <div className="bg-gray-50 p-3"></div>
            {weekDays.map(day => {
              const dateStr = formatDateToLocal(day);
              return (
                <div
                  key={dateStr}
                  className={`bg-gray-50 p-3 text-center cursor-pointer transition-colors ${
                    selectedDays.includes(dateStr)
                      ? 'bg-primary-50 border-2 border-primary-500'
                      : 'hover:bg-gray-100'
                  } ${isToday(day) ? 'bg-blue-50' : ''}`}
                  onClick={() => onDateSelect(dateStr)}
                >
                  <div className="text-sm font-medium text-gray-900">
                    {format(day, 'EEEE', { locale: ru })}
                  </div>
                  <div className={`text-lg font-bold ${isToday(day) ? 'text-primary-600' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(day, 'MMMM', { locale: ru })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Приемы пищи */}
          {mealTypes.map(mealType => (
            <div key={mealType.type} className="grid grid-cols-8 gap-px bg-gray-200">
              {/* Заголовок приема пищи */}
              <div className="bg-white p-3 flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  <span className="mr-2">{mealType.emoji}</span>
                  {mealType.label}
                </span>
              </div>

              {/* Ячейки для каждого дня */}
              {weekDays.map(day => {
                const dateStr = formatDateToLocal(day);
                const { mealPlan, recipes } = getRecipesForMeal(dateStr, mealType.type);

                return (
                  <div
                    key={dateStr}
                    className="bg-white p-3 min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => onAddMeal(dateStr, mealType.type)}
                  >
                    {recipes.length > 0 ? (
                      <div className="space-y-2">
                        {recipes.map(recipe => (
                          <div
                            key={recipe.id}
                            className="bg-primary-50 rounded-lg px-3 py-2 text-sm text-primary-800 border border-primary-200 relative group"
                          >
                            <div className="font-medium truncate pr-6">{recipe.recipe_name}</div>
                            <div className="flex justify-between text-xs text-primary-600 mt-1">
                              <span>{recipe.portions} порц.</span>
                              {recipe.recipe_cooking_time && (
                                <span>{recipe.recipe_cooking_time} мин</span>
                              )}
                            </div>

                            {/* Кнопка удаления */}
                            {mealPlan && (
                              <button
                                onClick={(e) => handleRemoveRecipe(mealPlan.id, recipe.id, e)}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                                title="Удалить рецепт"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm italic h-full flex items-center justify-center">
                        + Добавить рецепт
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeekCalendar;