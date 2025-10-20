// RecipesPage.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../stores/recipeStore';
import type { RecipeFilters } from '../types';
import SeoHead from '../components/SeoHead';

const RecipesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    filteredRecipes,
    isLoading,
    error,
    applyFilters,
    loadRecipes,
    loadTags,
    getPopularTags,
    nextPage,
    loadNextPage,
    isLoadingMore,
    isSearchLoading
  } = useRecipeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [maxCookingTime, setMaxCookingTime] = useState<number | ''>('');
  const [hasInitialized, setHasInitialized] = useState(false);

  // ИСПРАВЛЕННАЯ СТРОКА - явно указываем тип и инициализируем
  const searchTimeoutRef = useRef<number | null>(null);

  // Восстановление фильтров из localStorage и загрузка данных
  useEffect(() => {
    const savedFilters = localStorage.getItem('recipeFilters');
    if (savedFilters) {
      const { searchQuery: savedSearch, selectedTags: savedTags, maxCookingTime: savedTime } = JSON.parse(savedFilters);
      setSearchQuery(savedSearch || '');
      setSelectedTags(savedTags || []);
      setMaxCookingTime(savedTime || '');
    }

    // Загружаем рецепты и теги при инициализации
    const initializeData = async () => {
      await Promise.all([loadRecipes(), loadTags()]);
      setHasInitialized(true);
    };

    initializeData();
  }, [loadRecipes, loadTags]);

  // Сохранение фильтров в localStorage
  useEffect(() => {
    const filters = { searchQuery, selectedTags, maxCookingTime };
    localStorage.setItem('recipeFilters', JSON.stringify(filters));
  }, [searchQuery, selectedTags, maxCookingTime]);

  // Применение фильтров с debounce - ТОЛЬКО ПОСЛЕ ИНИЦИАЛИЗАЦИИ
  useEffect(() => {
    if (!hasInitialized) return;

    // Очищаем предыдущий таймаут
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    searchTimeoutRef.current = setTimeout(() => {
      const filters: RecipeFilters = {};

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
        // ИСПОЛЬЗУЕМ БЭКЕНД ДЛЯ ПОИСКА
        applyFilters(filters);
      } else {
        // Если фильтров нет, загружаем базовые рецепты
        loadRecipes();
      }
    }, 500); // Увеличиваем debounce для лучшего UX

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedTags, maxCookingTime, hasInitialized, applyFilters, loadRecipes]);

  // Загрузка дополнительных рецептов
  const handleLoadMore = async () => {
    if (!nextPage || isLoadingMore) return;
    await loadNextPage();
  };

  const handleRecipeClick = (recipeId: string) => {
    navigate(`/recipes/${recipeId}`);
  };

  const handleTagClick = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setMaxCookingTime('');
    // При явном сброе фильтров перезагружаем рецепты
    loadRecipes();
  };

  // Используем filteredRecipes для отображения (они содержат результаты поиска с бэкенда)
  const displayRecipes = filteredRecipes;
  const popularTags = getPopularTags();
  const hasActiveFilters = selectedTags.length > 0 || maxCookingTime || searchQuery;
  const isSearching = isSearchLoading && hasActiveFilters;

  // Структурированные данные для страницы рецептов
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Коллекция рецептов для планирования питания",
    "description": "Большая коллекция рецептов с фильтрацией по времени приготовления, сложности и тегам",
    "numberOfItems": displayRecipes.length,
    "itemListElement": displayRecipes.slice(0, 10).map((recipe, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Recipe",
        "name": recipe.name,
        "description": recipe.description || `Вкусный рецепт ${recipe.name}`,
        "cookTime": `PT${recipe.cooking_time}M`,
        "recipeYield": `${recipe.portions} порций`,
        "recipeIngredient": recipe.ingredients.map(ing =>
          `${ing.quantity} ${ing.unit_display} ${ing.ingredient_name}`
        ),
        "recipeInstructions": recipe.instructions.split('\n')
          .filter(step => step.trim())
          .map((step, idx) => ({
            "@type": "HowToStep",
            "position": idx + 1,
            "text": step.trim()
          }))
      }
    }))
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* SEO КОМПОНЕНТ */}
      <SeoHead
        title="Коллекция рецептов для планирования питания | Более 100+ проверенных рецептов"
        description="Большая коллекция рецептов с фильтрацией по времени приготовления, сложности и тегам. Рецепты для завтрака, обеда, ужина и перекусов. Быстрый поиск и удобная фильтрация."
        keywords="рецепты, готовка, кулинария, рецепты на каждый день, быстрые рецепты, здоровое питание, планирование питания, меню на неделю"
        structuredData={structuredData}
      />

      {/* H1 ЗАГОЛОВОК ДЛЯ SEO */}
      <div className="sr-only">
        <h1>Коллекция рецептов для планирования питания - Mealtime Planner</h1>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Коллекция рецептов</h2>
        <p className="text-gray-600">Найдите идеальный рецепт для любого приема пищи</p>
      </div>

      {/* Поиск и фильтры */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        {/* Строка поиска */}
        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Поиск рецептов по названию, ингредиентам или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full py-3 text-base pr-10"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Фильтр по времени */}
          <div>
            <label htmlFor="cookingTime" className="block text-sm font-medium text-gray-700 mb-2">
              Время приготовления до (мин):
            </label>
            <input
              id="cookingTime"
              type="number"
              placeholder="Например: 30"
              value={maxCookingTime}
              onChange={(e) => setMaxCookingTime(e.target.value ? parseInt(e.target.value) : '')}
              className="input-field w-full py-2"
              min="1"
            />
          </div>

          {/* Кнопка сброса */}
          <div className="flex items-end">
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        </div>

        {/* Теги */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Быстрые теги:
          </label>
          <div className="flex flex-wrap gap-2">
            {popularTags && popularTags.length > 0 ? (
              popularTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedTags.includes(tag.id)
                      ? 'ring-2 ring-offset-2 ring-primary-500 scale-105'
                      : 'opacity-90 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: selectedTags.includes(tag.id)
                      ? `${tag.color || '#6B7280'}CC`
                      : tag.color || '#6B7280',
                    color: 'white',
                  }}
                >
                  {tag.name}
                </button>
              ))
            ) : (
              <div className="text-gray-400 text-sm italic">
                Теги не найдены
              </div>
            )}
          </div>
        </div>

        {/* Статус поиска */}
        {isSearching && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center text-blue-700 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
              Ищем рецепты по вашему запросу...
            </div>
          </div>
        )}
      </div>

      {/* Состояние загрузки */}
      {isLoading && !hasActiveFilters && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600">Загрузка рецептов...</span>
        </div>
      )}

      {/* Сообщение об ошибке */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* Список рецептов */}
      {!isLoading && (
        <>
          {displayRecipes.length > 0 ? (
            <>
              {/* Информация о результатах поиска */}
              {hasActiveFilters && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-green-700 text-sm">
                    Найдено {displayRecipes.length} рецептов по вашему запросу
                    {searchQuery && ` по запросу "${searchQuery}"`}
                    {selectedTags.length > 0 && ` с тегами: ${selectedTags.map(tagId => {
                      const tag = popularTags.find(t => t.id === tagId);
                      return tag?.name;
                    }).filter(Boolean).join(', ')}`}
                    {maxCookingTime && ` с временем приготовления до ${maxCookingTime} минут`}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayRecipes.map(recipe => (
                  <div
                    key={recipe.id}
                    onClick={() => handleRecipeClick(recipe.id)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group"
                  >
                    {/* Карточка рецепта */}
                    <div className="p-4">
                      {/* Заголовок и описание */}
                      <div className="mb-3">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                          {recipe.name}
                        </h3>
                        {recipe.description && (
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {recipe.description}
                          </p>
                        )}
                      </div>

                      {/* Теги */}
                      {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {recipe.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag.id}
                              className="px-2 py-1 rounded-full text-xs text-white"
                              style={{ backgroundColor: tag.color || '#6B7280' }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {recipe.tags.length > 2 && (
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600">
                              +{recipe.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Мета-информация */}
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            ⏱️ {recipe.cooking_time} мин
                          </span>
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {recipe.difficulty_display}
                          </span>
                        </div>
                        <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs">
                          {recipe.portions} порц.
                        </span>
                      </div>

                      {/* Ингредиенты (превью) */}
                      {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {recipe.ingredients.slice(0, 3).map(ing => ing.ingredient_name).join(', ')}
                            {recipe.ingredients.length > 3 && '...'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Ховер-эффект */}
                    <div className="bg-primary-50 bg-opacity-0 group-hover:bg-opacity-100 transition-all duration-200 px-4 py-3 border-t border-gray-100">
                      <div className="text-primary-600 text-sm font-medium flex items-center justify-between">
                        <span>Открыть рецепт</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Кнопка загрузки дополнительных рецептов */}
              {nextPage && (
                <div className="mt-12 text-center">
                  <div className="border-t border-gray-200 pt-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium py-3 px-8 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-700"></div>
                          <span>Загрузка...</span>
                        </>
                      ) : (
                        <>
                          <span>📥 Загрузить еще рецепты</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-sm text-gray-500 mt-3">
                      Показано {displayRecipes.length} рецептов
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Сообщение, если рецептов нет */
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">
                {hasActiveFilters
                  ? 'Рецепты по вашему запросу не найдены. Попробуйте изменить фильтры.'
                  : 'Рецепты не найдены'
                }
              </div>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="btn-primary"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* SEO ТЕКСТ ДЛЯ ПОИСКОВИКОВ */}
      <div className="bg-white rounded-lg p-6 mt-12 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Коллекция проверенных рецептов для планирования питания</h2>
        <div className="prose max-w-none text-gray-700">
          <p className="mb-4">
            Наша коллекция содержит <strong>тщательно отобранные рецепты</strong> для каждого приема пищи.
            Все рецепты снабжены подробными инструкциями, точным списком ингредиентов и информацией о времени приготовления.
            Мы понимаем, как важно экономить время на кухне, поэтому все рецепты оптимизированы для быстрого и удобного приготовления.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Категории рецептов в нашей коллекции:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Завтраки</strong> - быстрые и питательные варианты для начала дня: омлеты, каши, смузи, тосты</li>
            <li><strong>Обеды</strong> - сытные блюда для основного приема пищи: супы, вторые блюда, салаты</li>
            <li><strong>Ужины</strong> - легкие и вкусные блюда для завершения дня: запеканки, рыба, овощные блюда</li>
            <li><strong>Перекусы</strong> - полезные снеки между основными приемами пищи: фруктовые нарезки, орехи, йогурты</li>
            <li><strong>Десерты</strong> - сладкие блюда для особых случаев: выпечка, фруктовые десерты, муссы</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-3">Преимущества нашей коллекции рецептов:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>Рецепты с пошаговыми инструкциями для легкого приготовления</li>
            <li>Точное время приготовления для каждого блюда для лучшего планирования</li>
            <li>Указание сложности приготовления (легко, средне, сложно)</li>
            <li>Фильтрация по диетическим предпочтениям и времени приготовления</li>
            <li>Возможность масштабирования порций под нужное количество человек</li>
            <li>Автоматическая генерация списка покупок на основе выбранных рецептов</li>
            <li>Цветные теги для быстрой категоризации рецептов</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-3">Как использовать коллекцию рецептов:</h3>
          <p className="mb-4">
            Наш планировщик питания позволяет не только находить подходящие рецепты, но и интегрировать их
            в ваше недельное меню. После выбора рецептов система автоматически сгенерирует оптимизированный
            список покупок, объединив одинаковые ингредиенты из разных блюд. Это поможет вам сэкономить
            время и деньги, избегая лишних покупок в магазине.
          </p>

          <div className="bg-primary-50 p-4 rounded-lg mt-6">
            <p className="text-primary-800 text-sm">
              <strong>💡 Совет:</strong> Используйте фильтры по времени приготовления и тегам, чтобы быстро
              находить рецепты, соответствующие вашим потребностям. Например, для быстрого ужина после работы
              установите фильтр "Время приготовления до 30 минут" и выберите тег "Ужин".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipesPage;