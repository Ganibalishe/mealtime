// components/AdaptiveWeekCalendar.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ
import React, { useState } from 'react';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { MealPlan } from '../types';
import ConfirmModal from './ConfirmModal';

interface AdaptiveWeekCalendarProps {
  currentDate: Date;
  mealPlans: MealPlan[];
  onDateSelect: (date: string) => void;
  onAddMeal: (date: string, mealType: string) => void;
  onRemoveRecipe: (mealPlanId: string, recipeMealPlanId: string) => void;
  onRecipeClick: (recipeId: string) => void; // ДОБАВИЛИ ЭТОТ ПРОПС
  selectedDays: string[];
}

const AdaptiveWeekCalendar: React.FC<AdaptiveWeekCalendarProps> = ({
  currentDate,
  mealPlans,
  onDateSelect,
  onAddMeal,
  onRemoveRecipe,
  onRecipeClick, // ДОБАВИЛИ
  selectedDays
}) => {
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    mealPlanId: string;
    recipeMealPlanId: string;
    recipeName: string;
    date: string;
    mealType: string;
  }>({
    isOpen: false,
    mealPlanId: '',
    recipeMealPlanId: '',
    recipeName: '',
    date: '',
    mealType: ''
  });

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

  // Безопасное форматирование даты для модального окна
  const safeFormatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return format(date, 'd MMMM yyyy', { locale: ru });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
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

  // Функция для получения общего количества рецептов за день
  const getTotalRecipesForDay = (date: string) => {
    const plans = getMealPlansForDate(date);
    return plans.reduce((total, plan) => total + plan.recipes.length, 0);
  };

  const getMealTypeLabel = (mealType: string) => {
    const meal = mealTypes.find(m => m.type === mealType);
    return meal ? meal.shortLabel : mealType;
  };

  const toggleDayExpansion = (dateStr: string) => {
    setExpandedDays(prev =>
      prev.includes(dateStr)
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const handleRemoveRecipeClick = (
    mealPlanId: string,
    recipeMealPlanId: string,
    recipeName: string,
    date: string,
    mealType: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    setDeleteModal({
      isOpen: true,
      mealPlanId,
      recipeMealPlanId,
      recipeName,
      date,
      mealType
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await onRemoveRecipe(deleteModal.mealPlanId, deleteModal.recipeMealPlanId);
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Error removing recipe:', error);
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      mealPlanId: '',
      recipeMealPlanId: '',
      recipeName: '',
      date: '',
      mealType: ''
    });
  };

  // Десктоп версия (таблица) - с изменениями для клика по рецепту
  const DesktopView = () => (
    <div className="hidden lg:block bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="bg-primary-500 px-6 py-4 border-b border-primary-600">
        <h3 className="text-lg font-semibold text-white">
          Неделя {format(weekStart, 'd MMMM', { locale: ru })} - {format(addDays(weekStart, 6), 'd MMMM', { locale: ru })}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider w-48">
                <div className="flex items-center">
                  День недели
                  <span className="ml-2 text-xs text-primary-500 bg-primary-50 px-2 py-1 rounded-full">
                    🔘 Нажмите для выбора
                  </span>
                </div>
              </th>
              {mealTypes.map(mealType => (
                <th
                  key={mealType.type}
                  className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider min-w-40"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-lg">{mealType.label.split(' ')[0]}</span>
                    <span className="text-xs mt-1">{mealType.shortLabel}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-neutral-200">
            {weekDays.map(day => {
              const dateStr = formatDateToLocal(day);
              const isSelected = selectedDays.includes(dateStr);
              const isCurrentDay = isToday(day);

              return (
                <tr
                  key={dateStr}
                  className={`hover:bg-neutral-50 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-accent-50 border-l-4 border-accent-500 shadow-sm'
                      : isCurrentDay
                      ? 'bg-primary-50 border-l-4 border-primary-500'
                      : ''
                  }`}
                  onClick={() => onDateSelect(dateStr)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                        isCurrentDay ? 'bg-primary-100 text-primary-800' : 'bg-neutral-100 text-neutral-800'
                      }`}>
                        <span className="text-sm font-bold">
                          {format(day, 'd')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">
                          {format(day, 'EEEE', { locale: ru })}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {format(day, 'd MMMM', { locale: ru })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-1">
                      {isSelected && (
                        <span className="inline-block bg-accent-500 text-white text-xs px-2 py-1 rounded-full">
                          Выбран
                        </span>
                      )}
                      {!isSelected && isCurrentDay && (
                        <span className="inline-block bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                          Сегодня
                        </span>
                      )}
                    </div>
                  </td>

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
                        <div className="min-h-24 cursor-pointer hover:bg-neutral-50 rounded-lg p-2 transition-colors">
                          {recipes.length > 0 ? (
                            <div className="space-y-2">
                              {recipes.map(recipe => (
                                <div
                                  key={recipe.id}
                                  className="bg-primary-50 rounded-lg p-3 text-primary-800 border border-primary-200 cursor-pointer hover:bg-primary-100 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRecipeClick(recipe.recipe); // ДОБАВИЛИ ОБРАБОТЧИК КЛИКА
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-medium text-sm leading-tight flex-1 pr-2">
                                      {recipe.recipe_name}
                                    </h4>
                                    {mealPlan && (
                                      <button
                                        onClick={(e) => handleRemoveRecipeClick(
                                          mealPlan.id,
                                          recipe.id,
                                          recipe.recipe_name,
                                          dateStr,
                                          mealType.type,
                                          e
                                        )}
                                        className="w-6 h-6 bg-accent-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-accent-600 flex-shrink-0 transition-colors"
                                        title="Удалить рецепт"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex justify-between text-xs text-primary-600 mt-2">
                                    <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded">
                                      {recipe.portions} порц.
                                    </span>
                                    {recipe.recipe_cooking_time && (
                                      <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded">
                                        {recipe.recipe_cooking_time} мин
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-neutral-400 text-sm italic h-24 flex items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg">
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

  // Мобильная версия (аккордеон) - с изменениями для клика по рецепту
  const MobileView = () => (
    <div className="lg:hidden space-y-3">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          Неделя {format(weekStart, 'd MMMM', { locale: ru })} - {format(addDays(weekStart, 6), 'd MMMM', { locale: ru })}
        </h3>
        <div className="text-sm text-neutral-600 bg-primary-50 p-3 rounded-lg">
          <span className="font-medium">📌 Как выбрать дни:</span>
          <p className="mt-1">Используйте чекбоксы для выбора дней, затем нажмите "Сформировать список покупок"</p>
        </div>
      </div>

      {weekDays.map(day => {
        const dateStr = formatDateToLocal(day);
        const isSelected = selectedDays.includes(dateStr);
        const isCurrentDay = isToday(day);
        const isExpanded = expandedDays.includes(dateStr);
        const totalRecipes = getTotalRecipesForDay(dateStr);

        return (
          <div
            key={dateStr}
            className={`bg-white rounded-lg shadow-sm overflow-hidden border-2 transition-all duration-200 ${
              isSelected
                ? 'border-accent-500 bg-accent-50 shadow-md'
                : isCurrentDay
                ? 'border-primary-500 bg-primary-50'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {/* Заголовок дня (всегда видимый) */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                {/* Левая часть: чекбокс и информация о дне */}
                <div className="flex items-center flex-1">
                  {/* Чекбокс для выбора дня */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onDateSelect(dateStr)}
                    className="h-5 w-5 text-accent-600 rounded focus:ring-accent-500 mr-3 cursor-pointer"
                  />

                  <div
                    className="flex items-center cursor-pointer flex-1"
                    onClick={() => toggleDayExpansion(dateStr)}
                  >
                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      isCurrentDay ? 'bg-primary-100 text-primary-800' : 'bg-neutral-100 text-neutral-800'
                    }`}>
                      <span className="text-sm font-bold">
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-neutral-900">
                        {format(day, 'EEEE', { locale: ru })}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {format(day, 'd MMMM', { locale: ru })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Правая часть: количество рецептов и стрелка */}
                <div className="flex items-center space-x-2">
                  {/* Количество рецептов */}
                  <div className="text-sm text-neutral-600 bg-neutral-100 px-2 py-1 rounded">
                    {totalRecipes} {getRecipeText(totalRecipes)}
                  </div>

                  {/* Стрелка аккордеона */}
                  <div
                    className="cursor-pointer"
                    onClick={() => toggleDayExpansion(dateStr)}
                  >
                    <svg
                      className={`w-5 h-5 text-neutral-500 transition-transform duration-200 ${
                        isExpanded ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Статус выбора */}
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-neutral-500 flex items-center">
                  {isSelected ? (
                    <>
                      <span className="w-2 h-2 bg-accent-500 rounded-full mr-1"></span>
                      <span>Выбран для списка покупок</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-neutral-300 rounded-full mr-1"></span>
                      <span>Не выбран</span>
                    </>
                  )}
                </div>

                {isCurrentDay && (
                  <span className="inline-block bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                    Сегодня
                  </span>
                )}
              </div>
            </div>

            {/* Содержимое дня (раскрывается по клику) */}
            {isExpanded && (
              <div className="divide-y divide-neutral-100">
                {mealTypes.map(mealType => {
                  const { mealPlan, recipes } = getRecipesForMeal(dateStr, mealType.type);

                  return (
                    <div
                      key={mealType.type}
                      className="p-4 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-neutral-900 flex items-center">
                          <span className="mr-2 text-lg">{mealType.label.split(' ')[0]}</span>
                          <span>{mealType.shortLabel}</span>
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddMeal(dateStr, mealType.type);
                          }}
                          className="text-primary-600 text-sm font-medium hover:text-primary-700 transition-colors"
                        >
                          + Добавить
                        </button>
                      </div>

                      {recipes.length > 0 ? (
                        <div className="space-y-3">
                          {recipes.map(recipe => (
                            <div
                              key={recipe.id}
                              className="bg-primary-50 rounded-lg p-3 text-primary-800 border border-primary-200 cursor-pointer hover:bg-primary-100 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRecipeClick(recipe.recipe); // ДОБАВИЛИ ОБРАБОТЧИК КЛИКА
                              }}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium text-sm leading-tight flex-1 pr-3">
                                  {recipe.recipe_name}
                                </h5>
                                {mealPlan && (
                                  <button
                                    onClick={(e) => handleRemoveRecipeClick(
                                      mealPlan.id,
                                      recipe.id,
                                      recipe.recipe_name,
                                      dateStr,
                                      mealType.type,
                                      e
                                    )}
                                    className="w-6 h-6 bg-accent-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-accent-600 flex-shrink-0 transition-colors"
                                    title="Удалить рецепт"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                              <div className="flex justify-between text-xs text-primary-600">
                                <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded">
                                  {recipe.portions} порц.
                                </span>
                                {recipe.recipe_cooking_time && (
                                  <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded">
                                    {recipe.recipe_cooking_time} мин
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddMeal(dateStr, mealType.type);
                          }}
                          className="text-neutral-400 text-sm italic py-4 text-center border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-50"
                        >
                          Нажмите, чтобы добавить рецепт
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Вспомогательная функция для правильного склонения слова "рецепт"
  const getRecipeText = (count: number) => {
    if (count === 1) return 'рецепт';
    if (count >= 2 && count <= 4) return 'рецепта';
    return 'рецептов';
  };

  return (
    <>
      <DesktopView />
      <MobileView />

      {/* Модальное окно подтверждения удаления */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Удаление рецепта"
        message={
          deleteModal.recipeName && deleteModal.mealType
            ? `Вы уверены, что хотите удалить рецепт "${deleteModal.recipeName}" из ${getMealTypeLabel(deleteModal.mealType)}${deleteModal.date ? ` на ${safeFormatDate(deleteModal.date)}` : ''}?`
            : 'Вы уверены, что хотите удалить этот рецепт?'
        }
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
      />
    </>
  );
};

export default AdaptiveWeekCalendar;