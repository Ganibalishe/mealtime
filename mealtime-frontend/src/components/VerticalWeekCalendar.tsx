import React from 'react';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { MealPlan } from '../types';
import { useMealPlanStore } from '../stores/mealPlanStore';

interface VerticalWeekCalendarProps {
  currentDate: Date;
  mealPlans: MealPlan[];
  onDateSelect: (date: string) => void;
  onAddMeal: (date: string, mealType: string) => void;
  selectedDays: string[];
}

const VerticalWeekCalendar: React.FC<VerticalWeekCalendarProps> = ({
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
    { type: 'breakfast', label: '☀️ Завтрак', shortLabel: 'Завтрак' },
    { type: 'lunch', label: '🍽️ Обед', shortLabel: 'Обед' },
    { type: 'dinner', label: '🌙 Ужин', shortLabel: 'Ужин' },
    { type: 'snack', label: '🥨 Перекус', shortLabel: 'Перекус' },
    { type: 'supper', label: '🍎 Поздний ужин', shortLabel: 'Поздн. ужин' },
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
    event.stopPropagation();

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
      <div className="bg-gray-50 px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Неделя {format(weekStart, 'd MMMM', { locale: ru })} - {format(addDays(weekStart, 6), 'd MMMM', { locale: ru })}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Заголовки столбцов */}
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                День недели
              </th>
              {mealTypes.map(mealType => (
                <th
                  key={mealType.type}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-40"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-lg">{mealType.label.split(' ')[0]}</span>
                    <span className="text-xs mt-1">{mealType.shortLabel}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Тело таблицы - дни недели */}
          <tbody className="bg-white divide-y divide-gray-200">
            {weekDays.map(day => {
              const dateStr = formatDateToLocal(day);
              const isSelected = selectedDays.includes(dateStr);
              const isCurrentDay = isToday(day);

              return (
                <tr
                  key={dateStr}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    isSelected ? 'bg-primary-25' : ''
                  } ${isCurrentDay ? 'bg-blue-25' : ''}`}
                  onClick={() => onDateSelect(dateStr)}
                >
                  {/* Ячейка дня */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                        isCurrentDay ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        <span className="text-sm font-bold">
                          {format(day, 'd')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {format(day, 'EEEE', { locale: ru })}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(day, 'd MMMM', { locale: ru })}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Ячейки приемов пищи */}
                  {mealTypes.map(mealType => {
                    const { mealPlan, recipes } = getRecipesForMeal(dateStr, mealType.type);

                    return (
                      <td
                        key={`${dateStr}-${mealType.type}`}
                        className="px-4 py-4 align-top min-h-32"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddMeal(dateStr, mealType.type);
                        }}
                      >
                        <div className="min-h-24 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors">
                          {recipes.length > 0 ? (
                            <div className="space-y-2">
                              {recipes.map(recipe => (
                                <div
                                  key={recipe.id}
                                  className="bg-primary-50 rounded-lg p-3 text-primary-800 border border-primary-200"
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-medium text-sm leading-tight flex-1 pr-2">
                                      {recipe.recipe_name}
                                    </h4>
                                    {mealPlan && (
                                      <button
                                        onClick={(e) => handleRemoveRecipe(mealPlan.id, recipe.id, e)}
                                        className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 flex-shrink-0 ml-1"
                                        title="Удалить рецепт"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex justify-between text-xs text-primary-600 mt-2">
                                    <span className="bg-primary-100 px-2 py-1 rounded">
                                      {recipe.portions} порц.
                                    </span>
                                    {recipe.recipe_cooking_time && (
                                      <span className="bg-primary-100 px-2 py-1 rounded">
                                        {recipe.recipe_cooking_time} мин
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm italic h-24 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                              + Добавить рецепт
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VerticalWeekCalendar;