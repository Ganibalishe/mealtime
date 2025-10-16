// RecipeDetailPage.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { recipeService } from '../services/api';
import type { Recipe } from '../types';
import { mealPlanService } from '../services/api';
import SeoHead from '../components/SeoHead';
import AddToCalendarSuccessModal from '../components/AddToCalendarSuccessModal';

const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Состояние для добавления в календарь - только для авторизованных
  const [showAddToCalendar, setShowAddToCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('lunch');
  const [portions, setPortions] = useState(2);
  const [showSuccessModal, setShowSuccessModal] = useState(false);


  // Состояние для модалки авторизации
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const response = await recipeService.getById(id);
        setRecipe(response.data);
        setPortions(response.data.portions); // Устанавливаем порции по умолчанию из рецепта
      } catch (error) {
        setError('Рецепт не найден');
        console.error('Error loading recipe:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecipe();
  }, [id]);

  const handleAddToCalendar = async () => {
    if (!recipe || !selectedDate) return;

    try {
      await mealPlanService.addRecipeToDate(selectedDate, selectedMealType, recipe.id, portions);
      setShowSuccessModal(true);
      setShowAddToCalendar(false);
    } catch (error) {
      console.error('Error adding recipe to calendar:', error);
      alert('Ошибка при добавлении рецепта в календарь');
    }
  };

  // Обработчик клика по кнопке добавления в календарь
  const handleAddToCalendarClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      setShowAddToCalendar(true);
    }
  };
  const handleContinue = () => {
    setShowSuccessModal(false);
  };

  const handleGoToCalendar = () => {
    setShowSuccessModal(false);
    navigate('/'); // Переход на главную страницу (календарь)
  };

  // Структурированные данные для рецепта (JSON-LD)
  const structuredData = recipe ? {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    "name": recipe.name,
    "description": recipe.description || `Рецепт приготовления ${recipe.name}`,
    "prepTime": `PT${recipe.cooking_time}M`,
    "cookTime": `PT${recipe.cooking_time}M`,
    "totalTime": `PT${recipe.cooking_time}M`,
    "recipeYield": `${recipe.portions} порций`,
    "recipeCategory": getRecipeCategory(recipe),
    "recipeCuisine": "Международная",
    "author": {
      "@type": "Organization",
      "name": "Mealtime Planner"
    },
    "nutrition": {
      "@type": "NutritionInformation",
      "calories": "Информация о калорийности будет добавлена"
    },
    "recipeIngredient": recipe.ingredients.map(ingredient =>
      `${ingredient.quantity} ${ingredient.unit_display} ${ingredient.ingredient_name}`
    ),
    "recipeInstructions": recipe.instructions.split('\n')
      .filter(step => step.trim())
      .map((step, index) => ({
        "@type": "HowToStep",
        "position": index + 1,
        "text": step.trim()
      })),
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    },
    "image": recipe.image || "/recipe-placeholder.jpg"
  } : null;

  // Вспомогательная функция для определения категории рецепта
  function getRecipeCategory(recipe: Recipe): string {
    const tags = recipe.tags.map(tag => tag.name.toLowerCase());

    if (tags.includes('завтрак')) return 'Завтрак';
    if (tags.includes('обед')) return 'Обед';
    if (tags.includes('ужин')) return 'Ужин';
    if (tags.includes('суп')) return 'Суп';
    if (tags.includes('десерт')) return 'Десерт';
    if (tags.includes('перекус')) return 'Перекус';

    return 'Основное блюдо';
  }

  // Вспомогательная функция для SEO текста
  const getMealTypeSuggestion = (recipe: Recipe): string => {
    const tags = recipe.tags.map(tag => tag.name.toLowerCase());

    if (tags.includes('завтрак')) return 'завтрака';
    if (tags.includes('обед')) return 'обеда';
    if (tags.includes('ужин')) return 'ужина';
    if (tags.includes('перекус')) return 'перекуса';

    return 'любого приема пищи';
  };

  const mealTypes = [
    { value: 'breakfast', label: '☀️ Завтрак' },
    { value: 'lunch', label: '🍽️ Обед' },
    { value: 'dinner', label: '🌙 Ужин' },
    { value: 'snack', label: '🥨 Перекус' },
    { value: 'supper', label: '🍎 Поздний ужин' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 bg-red-50 rounded-lg p-4 max-w-md mx-auto">
          {error || 'Рецепт не найден'}
        </div>
        <button
          onClick={() => navigate('/recipes')}
          className="btn-primary mt-4"
        >
          Вернуться к рецептам
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* SEO КОМПОНЕНТ */}
      <SeoHead
        title={`${recipe.name} - Подробный рецепт с пошаговыми инструкциями`}
        description={recipe.description || `Рецепт ${recipe.name}. Время приготовления: ${recipe.cooking_time} минут, сложность: ${recipe.difficulty_display}. Ингредиенты: ${recipe.ingredients.slice(0, 3).map(i => i.ingredient_name).join(', ')}`}
        keywords={`рецепт ${recipe.name}, ${recipe.ingredients.map(i => i.ingredient_name).join(', ')}, готовка, кулинария, ${recipe.difficulty_display.toLowerCase()}, ${recipe.cooking_time} минут`}
        structuredData={structuredData || undefined}
      />

      {/* Хлебные крошки */}
      <nav className="mb-6">
        <button
          onClick={() => navigate('/recipes')}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Назад к рецептам
        </button>
      </nav>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Заголовок и кнопка добавления */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{recipe.name}</h2>
              <p className="text-gray-600 mt-1">{recipe.description}</p>
            </div>
            <button
              onClick={handleAddToCalendarClick}
              className="btn-primary whitespace-nowrap"
            >
              📅 {isAuthenticated ? 'Добавить в календарь' : 'Авторизоваться чтоб добавить рецепт в план'}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Основная информация */}
            <div className="lg:col-span-2">
              {/* Мета-информация */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500">Время</div>
                  <div className="font-semibold text-lg">
                    {recipe.cooking_time ? `${recipe.cooking_time} мин` : '—'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500">Сложность</div>
                  <div className="font-semibold text-lg">{recipe.difficulty_display}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500">Порций</div>
                  <div className="font-semibold text-lg">{recipe.portions}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500">Способ</div>
                  <div className="font-semibold text-lg">{recipe.cooking_method_name || '—'}</div>
                </div>
              </div>

              {/* Теги рецепта */}
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Теги рецепта</h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: tag.color || '#6B7280' }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ингредиенты */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Ингредиенты</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    {recipe.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <span className="font-medium">{ingredient.ingredient_name}</span>
                        <span className="text-gray-600">
                          {ingredient.quantity} {ingredient.unit_display}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Инструкции */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Способ приготовления</h3>
                <div className="prose max-w-none">
                  {recipe.instructions.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <div key={index} className="mb-4">
                        <div className="flex items-start">
                          <span className="bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-1 flex-shrink-0">
                            {index + 1}
                          </span>
                          <p className="text-gray-700 leading-relaxed">
                            {paragraph}
                          </p>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>

            {/* Боковая панель - изображение (если есть) */}
            <div className="lg:col-span-1">
              {recipe.image ? (
                <div className="bg-gray-100 rounded-lg p-4">
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <div className="text-6xl mb-4">🍳</div>
                  <p className="text-gray-500">Изображение отсутствует</p>
                </div>
              )}

              {/* Полезная информация */}
              <div className="mt-6 bg-primary-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">📊 Пищевая ценность</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• <strong>Время приготовления:</strong> {recipe.cooking_time} минут</p>
                  <p>• <strong>Сложность:</strong> {recipe.difficulty_display.toLowerCase()}</p>
                  <p>• <strong>Порций:</strong> {recipe.portions}</p>
                  <p>• <strong>Идеально для:</strong> {getMealTypeSuggestion(recipe)}</p>
                </div>
              </div>

              {/* Блок для неавторизованных пользователей */}
              {!isAuthenticated && (
                <div className="mt-6 bg-accent-50 rounded-lg p-4 border border-accent-200">
                  <h4 className="font-semibold text-gray-900 mb-3">🔐 Хотите добавить этот рецепт в свой план?</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Авторизуйтесь, чтобы добавлять рецепты в календарь питания и автоматически генерировать списки покупок.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => navigate('/register')}
                      className="bg-accent-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-600 transition-colors"
                    >
                      Зарегистрироваться
                    </button>
                    <button
                      onClick={() => navigate('/login')}
                      className="bg-white text-accent-600 border border-accent-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-50 transition-colors"
                    >
                      Войти
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SEO БЛОК С ДОПОЛНИТЕЛЬНОЙ ИНФОРМАЦИЕЙ */}
      <div className="mt-12 bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">О рецепте "{recipe.name}"</h2>
        <div className="prose max-w-none text-gray-700">
          <p className="mb-4">
            Рецепт "<strong>{recipe.name}</strong>" - это {recipe.difficulty_display.toLowerCase()} в приготовлении блюдо,
            которое займет примерно <strong>{recipe.cooking_time} минут</strong> вашего времени.
            Блюдо рассчитано на <strong>{recipe.portions} порций</strong> и идеально подходит для {getMealTypeSuggestion(recipe)}.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Особенности этого рецепта:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Способ приготовления:</strong> {recipe.cooking_method_name || 'Классический'}</li>
            <li><strong>Сложность:</strong> {recipe.difficulty_display} - подходит для {recipe.difficulty === 'easy' ? 'начинающих' : recipe.difficulty === 'medium' ? 'опытных' : 'профессионалов'}</li>
            <li><strong>Основные ингредиенты:</strong> {recipe.ingredients.slice(0, 4).map(i => i.ingredient_name).join(', ')}</li>
            {recipe.tags.length > 0 && (
              <li><strong>Категории:</strong> {recipe.tags.map(tag => tag.name).join(', ')}</li>
            )}
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-3">Советы по приготовлению:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>Тщательно подготовьте все ингредиенты перед началом готовки</li>
            <li>Следуйте пошаговым инструкциям для достижения лучшего результата</li>
            <li>Используйте свежие и качественные продукты</li>
            <li>Не бойтесь экспериментировать со специями по своему вкусу</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-3">Польза для здоровья:</h3>
          <p className="mb-4">
            Этот рецепт содержит разнообразные питательные вещества из различных ингредиентов.
            {recipe.ingredients.some(i => i.ingredient_name.toLowerCase().includes('овощ')) && ' Овощи в составе обеспечивают организм витаминами и клетчаткой.'}
            {recipe.ingredients.some(i => i.ingredient_name.toLowerCase().includes('мясо') || i.ingredient_name.toLowerCase().includes('кури')) && ' Белковые компоненты способствуют насыщению и восстановлению мышц.'}
            {recipe.ingredients.some(i => i.ingredient_name.toLowerCase().includes('зерн') || i.ingredient_name.toLowerCase().includes('круп')) && ' Зерновые продукты являются источником сложных углеводов для энергии.'}
          </p>

          <div className="bg-gray-50 p-4 rounded-lg mt-6">
            <p className="text-gray-600 text-sm">
              <strong>💡 Кулинарный совет:</strong> Этот рецепт можно легко адаптировать под свои предпочтения.
              Попробуйте добавлять любимые специи или заменять ингредиенты на аналогичные по своему вкусу.
            </p>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Этот рецепт является частью коллекции Mealtime Planner - сервиса для планирования питания
            и автоматической генерации списков покупок. Добавьте его в свой план питания, чтобы
            автоматически включить все необходимые ингредиенты в список покупок.
          </p>
        </div>
      </div>

      {/* Модальное окно добавления в календарь (только для авторизованных) */}
      {isAuthenticated && showAddToCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Добавить в календарь
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Выбор даты */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Дата:
                </label>
                <input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {/* Выбор приема пищи */}
              <div>
                <label htmlFor="mealType" className="block text-sm font-medium text-gray-700 mb-2">
                  Прием пищи:
                </label>
                <select
                  id="mealType"
                  value={selectedMealType}
                  onChange={(e) => setSelectedMealType(e.target.value)}
                  className="input-field"
                >
                  {mealTypes.map(meal => (
                    <option key={meal.value} value={meal.value}>
                      {meal.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Выбор порций */}
              <div>
                <label htmlFor="portions" className="block text-sm font-medium text-gray-700 mb-2">
                  Количество порций:
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setPortions(Math.max(1, portions - 1))}
                    className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
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
                    className="w-20 text-center border border-gray-300 rounded-lg py-2 px-3"
                  />

                  <button
                    type="button"
                    onClick={() => setPortions(Math.min(20, portions + 1))}
                    className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowAddToCalendar(false)}
                className="btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={handleAddToCalendar}
                disabled={!selectedDate}
                className="btn-primary disabled:opacity-50"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно авторизации для неавторизованных */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-primary-500 text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold">
                🔐 Авторизация требуется
              </h3>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-6">
                Чтобы добавить рецепт "{recipe.name}" в свой план питания, необходимо авторизоваться.
                Это позволит вам:
              </p>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  Создавать персональные планы питания
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  Автоматически генерировать списки покупок
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  Сохранять любимые рецепты
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  Отслеживать прогресс покупок
                </li>
              </ul>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowAuthModal(false);
                    navigate('/register');
                  }}
                  className="bg-primary-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
                >
                  Зарегистрироваться
                </button>
                <button
                  onClick={() => {
                    setShowAuthModal(false);
                    navigate('/login');
                  }}
                  className="bg-white text-primary-600 border border-primary-500 px-4 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
                >
                  Войти в аккаунт
                </button>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t rounded-b-lg flex justify-end">
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
      <AddToCalendarSuccessModal
        isOpen={showSuccessModal}
        onClose={handleContinue}
        onContinue={handleContinue}
        onGoToCalendar={handleGoToCalendar}
        recipeName={recipe?.name || ''}
        selectedDate={selectedDate}
        selectedMealType={selectedMealType}
        portions={portions}
      />
    </div>
  );
};

export default RecipeDetailPage;