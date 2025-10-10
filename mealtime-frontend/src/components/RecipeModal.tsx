import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useRecipeStore } from '../stores/recipeStore';
import type { Recipe, Tag } from '../types';
import Portal from '../components/Portal';

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeSelect: (recipe: Recipe, portions: number) => void;
  mealType: string;
  selectedDate: string;
}

const RecipeModal: React.FC<RecipeModalProps> = ({
  isOpen,
  onClose,
  onRecipeSelect,
  mealType,
  selectedDate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [portions, setPortions] = useState(2);
  const [recipePortions, setRecipePortions] = useState<{[key: string]: number}>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [maxCookingTime, setMaxCookingTime] = useState<number | ''>('');

  const {
    filteredRecipes,
    isLoading,
    error,
    searchRecipes,
    loadRecipes,
    clearFilters,
    loadTags,
    getPopularTags,
    applyFilters,
    tags
  } = useRecipeStore();

  const formatDateString = (dateStr: string): string => {
    try {
      const date = parseISO(dateStr);
      return format(date, 'd MMMM yyyy', { locale: ru });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr;
    }
  };

  // Загрузка данных при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      loadRecipes();
      loadTags().then(() => {
        console.log('Tags loaded:', getPopularTags());
      });
      clearFilters();
      setRecipePortions({});
      setSelectedTags([]);
      setMaxCookingTime('');
    }
  }, [isOpen, loadRecipes, loadTags, clearFilters]);

  // Применение фильтров при изменении параметров
  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
      const filters: any = {};

      if (searchQuery.trim()) {
        filters.q = searchQuery;
      }

      if (selectedTags.length > 0) {
        filters.tags = selectedTags;
      }

      if (maxCookingTime) {
        filters.max_time = maxCookingTime;
      }

      if (Object.keys(filters).length > 0) {
        applyFilters(filters);
      } else {
        loadRecipes();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedTags, maxCookingTime, isOpen, applyFilters, loadRecipes]);

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setPortions(recipe.portions);
  };

  const handleAddRecipe = () => {
    if (selectedRecipe) {
      onRecipeSelect(selectedRecipe, portions);
      setSelectedRecipe(null);
      setPortions(2);
    }
  };

  const handleQuickAdd = (recipe: Recipe) => {
    const portionsToUse = recipePortions[recipe.id] || recipe.portions;
    onRecipeSelect(recipe, portionsToUse);
  };

  const handlePortionChange = (recipeId: string, newPortions: number) => {
    setRecipePortions(prev => ({
      ...prev,
      [recipeId]: Math.max(1, newPortions)
    }));
  };

  const handleTagClick = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
    setMaxCookingTime('');
    setSearchQuery('');
  };

  const handleClose = () => {
    setSelectedRecipe(null);
    setPortions(2);
    setSearchQuery('');
    setRecipePortions({});
    setSelectedTags([]);
    setMaxCookingTime('');
    onClose();
  };

  // Закрытие по ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const mealTypeLabels = {
    breakfast: 'Завтрак',
    lunch: 'Обед',
    dinner: 'Ужин',
    snack: 'Перекус',
    supper: 'Поздний ужин'
  };

  const popularTags = getPopularTags();
  const hasActiveFilters = selectedTags.length > 0 || maxCookingTime || searchQuery;
  
  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] my-auto overflow-hidden flex flex-col">
          {/* Заголовок */}
          <div className="bg-primary-500 px-4 sm:px-6 py-4 border-b border-primary-600 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate">
                  {selectedRecipe ? 'Выбор количества порций' : 'Выберите рецепт'}
                </h3>
                <p className="text-sm text-primary-100 truncate">
                  {formatDateString(selectedDate)} - {mealTypeLabels[mealType as keyof typeof mealTypeLabels]}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-primary-100 hover:text-white text-2xl flex-shrink-0 ml-2 w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          </div>

          {selectedRecipe ? (
            /* Детали рецепта и выбор порций */
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Информация о рецепте */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-neutral-900 mb-2">{selectedRecipe.name}</h4>
                    {selectedRecipe.description && (
                      <p className="text-neutral-600 text-sm sm:text-base">{selectedRecipe.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-50 rounded-lg p-3">
                      <div className="text-sm text-neutral-500">Время приготовления</div>
                      <div className="font-semibold text-sm sm:text-base">
                        {selectedRecipe.cooking_time ? `${selectedRecipe.cooking_time} мин` : 'Не указано'}
                      </div>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-3">
                      <div className="text-sm text-neutral-500">Сложность</div>
                      <div className="font-semibold text-sm sm:text-base">{selectedRecipe.difficulty_display}</div>
                    </div>
                  </div>

                  {/* Теги рецепта */}
                  {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-neutral-900 mb-2 text-sm sm:text-base">Теги:</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedRecipe.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="px-3 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: tag.color || '#6B7280' }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ингредиенты */}
                  <div>
                    <h5 className="font-semibold text-neutral-900 mb-2 text-sm sm:text-base">Ингредиенты:</h5>
                    <div className="bg-neutral-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="space-y-2">
                        {selectedRecipe.ingredients.map((ingredient, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="flex-1 pr-2">{ingredient.ingredient_name}</span>
                            <span className="text-neutral-600 whitespace-nowrap">
                              {ingredient.quantity} {ingredient.unit_display}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Выбор порций */}
                <div className="bg-neutral-50 rounded-lg p-4 sm:p-6 space-y-4">
                  <h5 className="font-semibold text-neutral-900 text-sm sm:text-base">Количество порций</h5>

                  <div>
                    <label htmlFor="portions" className="block text-sm font-medium text-neutral-700 mb-2">
                      Порций:
                    </label>
                    <div className="flex items-center justify-center space-x-4">
                      <button
                        type="button"
                        onClick={() => setPortions(Math.max(1, portions - 1))}
                        className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center hover:bg-neutral-300 text-lg font-bold mobile-touch-target"
                      >
                        -
                      </button>

                      <input
                        id="portions"
                        type="number"
                        min="1"
                        max="20"
                        value={portions}
                        onChange={(e) => setPortions(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 text-center border border-neutral-300 rounded-lg py-2 px-3 text-lg font-semibold"
                      />

                      <button
                        type="button"
                        onClick={() => setPortions(Math.min(20, portions + 1))}
                        className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center hover:bg-neutral-300 text-lg font-bold mobile-touch-target"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Информация о масштабировании */}
                  <div className="text-sm text-neutral-600 bg-white rounded p-3">
                    <p className="mb-2">Количество ингредиентов будет автоматически пересчитано для {portions} порций.</p>
                    {selectedRecipe.portions !== portions && (
                      <p className="text-primary-600 font-medium">
                        Изначально: {selectedRecipe.portions} порций
                      </p>
                    )}
                  </div>

                  {/* Кнопки действий */}
                  <div className="space-y-3 sm:space-y-0 sm:flex sm:space-x-3">
                    <button
                      onClick={() => setSelectedRecipe(null)}
                      className="btn-outline w-full sm:flex-1 py-3 text-sm sm:text-base mobile-touch-target"
                    >
                      Назад к выбору
                    </button>
                    <button
                      onClick={() => {
                        window.open(`/recipes/${selectedRecipe.id}`, '_blank');
                      }}
                      className="bg-secondary-400 hover:bg-secondary-500 text-neutral-900 font-medium py-3 px-4 rounded-lg transition-colors duration-200 w-full sm:w-auto text-sm sm:text-base mobile-touch-target"
                    >
                      📖 Подробнее
                    </button>
                    <button
                      onClick={handleAddRecipe}
                      className="btn-accent w-full sm:flex-1 py-3 text-sm sm:text-base mobile-touch-target"
                    >
                      Добавить рецепт
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Список рецептов с фильтрами */
            <>
              {/* Поиск и фильтры */}
              <div className="p-4 sm:p-6 border-b flex-shrink-0 space-y-4">
                {/* Строка поиска */}
                <input
                  type="text"
                  placeholder="Поиск рецептов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field py-3 text-base w-full"
                />

                {/* Фильтр по времени */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex-1 w-full sm:w-auto">
                    <label htmlFor="cookingTime" className="block text-sm font-medium text-neutral-700 mb-1">
                      Время приготовления до (мин):
                    </label>
                    <input
                      id="cookingTime"
                      type="number"
                      placeholder="Например: 30"
                      value={maxCookingTime}
                      onChange={(e) => setMaxCookingTime(e.target.value ? parseInt(e.target.value) : '')}
                      className="input-field py-2 text-base w-full"
                      min="1"
                    />
                  </div>

                  {/* Кнопка сброса фильтров */}
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium mobile-touch-target whitespace-nowrap mt-6 sm:mt-0"
                    >
                      Сбросить фильтры
                    </button>
                  )}
                </div>

                {/* Теги - ИСПРАВЛЕННАЯ ВЕРСИЯ */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Быстрые теги:
                  </label>
                  <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {popularTags && popularTags.length > 0 ? (
                      popularTags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => handleTagClick(tag.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 mobile-touch-target border ${
                            selectedTags.includes(tag.id)
                              ? 'ring-2 ring-offset-2 ring-primary-500 scale-105'
                              : 'opacity-90 hover:opacity-100 hover:scale-105'
                          }`}
                          style={{
                            backgroundColor: selectedTags.includes(tag.id)
                              ? `${tag.color || '#6B7280'}CC`
                              : tag.color || '#6B7280',
                            color: 'white',
                            borderColor: selectedTags.includes(tag.id) ? tag.color || '#6B7280' : 'transparent'
                          }}
                        >
                          {tag.name}
                        </button>
                      ))
                    ) : (
                      <div className="text-neutral-400 text-sm italic">
                        Теги не найдены
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Сообщение об ошибке */}
              {error && (
                <div className="mx-4 sm:mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex-shrink-0">
                  <div className="text-red-700 text-sm">{error}</div>
                </div>
              )}

              {/* Список рецептов */}
              <div className="overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    <span className="ml-3 text-neutral-600">Загрузка рецептов...</span>
                  </div>
                ) : (
                  <>
                    {filteredRecipes.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-6">
                        {filteredRecipes.map(recipe => {
                          const currentPortions = recipePortions[recipe.id] || recipe.portions;

                          return (
                            <div
                              key={recipe.id}
                              className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary-300 mobile-touch-target min-h-[160px] flex flex-col justify-between"
                              onClick={() => handleRecipeClick(recipe)}
                            >
                              <div className="flex-1">
                                <h4 className="font-semibold text-neutral-900 mb-2 text-sm sm:text-base line-clamp-2">
                                  {recipe.name}
                                </h4>
                                <p className="text-neutral-600 text-xs sm:text-sm line-clamp-2 mb-2">
                                  {recipe.description}
                                </p>

                                {/* Теги рецепта в списке */}
                                {recipe.tags && recipe.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {recipe.tags.slice(0, 2).map(tag => (
                                      <span
                                        key={tag.id}
                                        className="px-2 py-0.5 rounded-full text-xs text-white"
                                        style={{ backgroundColor: tag.color || '#6B7280' }}
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                    {recipe.tags.length > 2 && (
                                      <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-200 text-neutral-600">
                                        +{recipe.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2">
                                {/* Мета-информация */}
                                <div className="flex justify-between text-xs text-neutral-500">
                                  <span>{recipe.cooking_time} мин</span>
                                  <span>{recipe.difficulty_display}</span>
                                  <span>{recipe.portions} порций</span>
                                </div>

                                {/* Быстрое добавление */}
                                <div
                                  className="flex items-center justify-between gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center space-x-1 flex-1">
                                    <button
                                      onClick={() => handlePortionChange(recipe.id, currentPortions - 1)}
                                      className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center hover:bg-neutral-300 text-sm font-bold mobile-touch-target"
                                      disabled={currentPortions <= 1}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      max="20"
                                      value={currentPortions}
                                      onChange={(e) => handlePortionChange(recipe.id, parseInt(e.target.value) || 1)}
                                      className="w-12 text-center border border-neutral-300 rounded py-1 text-xs mobile-touch-target"
                                    />
                                    <button
                                      onClick={() => handlePortionChange(recipe.id, currentPortions + 1)}
                                      className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center hover:bg-neutral-300 text-sm font-bold mobile-touch-target"
                                      disabled={currentPortions >= 20}
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => handleQuickAdd(recipe)}
                                    className="bg-accent-500 hover:bg-accent-600 text-white text-xs py-2 px-3 rounded transition-colors duration-200 mobile-touch-target whitespace-nowrap"
                                  >
                                    Добавить
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-neutral-500 px-4">
                        {hasActiveFilters
                          ? 'Рецепты по вашему запросу не найдены. Попробуйте изменить фильтры.'
                          : 'Рецепты не найдены'
                        }
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
};

export default RecipeModal;