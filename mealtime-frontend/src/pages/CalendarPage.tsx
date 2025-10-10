// CalendarPage.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import VerticalWeekCalendar from '../components/VerticalWeekCalendar';
import RecipeModal from '../components/RecipeModal';
import SuccessModal from '../components/SuccessModal';
import WarningModal from '../components/WarningModal';
import InstructionBlock from '../components/InstructionBlock';
import SeoHead from '../components/SeoHead';
import { useMealPlanStore } from '../stores/mealPlanStore';
import { useRecipeStore } from '../stores/recipeStore';
import type { Recipe } from '../types';
import AdaptiveWeekCalendar from '../components/AdaptiveWeekCalendar';

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');

  // Используем useRef для отслеживания предыдущих дат и предотвращения дублирования
  const previousWeekRange = useRef<{start: string, end: string} | null>(null);
  const isAuthenticated = useAuth();
  const navigate = useNavigate();

  const {
    mealPlans,
    selectedDays,
    isLoading,
    error,
    loadMealPlans,
    toggleDaySelection,
    addRecipeToMealPlan,
    generateShoppingList,
    removeRecipeFromMealPlan
  } = useMealPlanStore();

  const { loadRecipes } = useRecipeStore();

  const formatDateToLocal = useCallback((date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  }, []);

  // Функция для получения диапазона дат текущей недели
  const getWeekRange = useCallback(() => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const endDate = addDays(startDate, 6);
    return {
      start: formatDateToLocal(startDate),
      end: formatDateToLocal(endDate)
    };
  }, [currentDate, formatDateToLocal]);

  // Функция для загрузки данных недели
  const loadWeekData = useCallback(async () => {
    const weekRange = getWeekRange();

    // Проверяем, не загружаем ли мы те же данные
    if (previousWeekRange.current &&
        previousWeekRange.current.start === weekRange.start &&
        previousWeekRange.current.end === weekRange.end) {
      return;
    }

    await loadMealPlans(weekRange.start, weekRange.end);
    previousWeekRange.current = weekRange;
  }, [getWeekRange, loadMealPlans]);

  // Загрузка при монтировании и смене недели - ТОЛЬКО ДЛЯ АВТОРИЗОВАННЫХ
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      await loadWeekData();
      // Рецепты загружаем только один раз
      if (!previousWeekRange.current) {
        await loadRecipes();
      }
    };

    loadData();
  }, [loadWeekData, loadRecipes, isAuthenticated]);

  const handleDateSelect = (date: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    toggleDaySelection(date);
  };

  const handleAddMeal = (date: string, mealType: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSelectedDate(date);
    setSelectedMealType(mealType);
    setShowRecipeModal(true);
  };

  const handleRecipeSelect = async (recipe: Recipe, portions: number) => {
    try {
      await addRecipeToMealPlan(selectedDate, selectedMealType, recipe, portions);
      setShowRecipeModal(false);
      // После успешного добавления перезагружаем данные недели
      await loadWeekData();
    } catch (error) {
      console.error('Error adding recipe to meal plan:', error);
    }
  };

  // Функция для удаления рецепта
  const handleRemoveRecipe = async (mealPlanId: string, recipeMealPlanId: string) => {
    try {
      await removeRecipeFromMealPlan(mealPlanId, recipeMealPlanId);
      // После успешного удаления перезагружаем данные недели
      await loadWeekData();
    } catch (error) {
      console.error('Error removing recipe from meal plan:', error);
    }
  };

  const handleGenerateShoppingList = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Проверяем выбраны ли дни, если нет - показываем предупреждение
    if (selectedDays.length === 0) {
      setShowWarningModal(true);
      return;
    }

    try {
      const sortedDays = selectedDays.sort();
      const startDate = sortedDays[0];
      const endDate = sortedDays[sortedDays.length - 1];

      await generateShoppingList(startDate, endDate, `Список покупок с ${startDate} по ${endDate}`);

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error generating shopping list:', error);
      alert('Ошибка при создании списка покупок');
    }
  };

  const handleContinue = () => {
    setShowSuccessModal(false);
  };

  const handleGoToList = () => {
    setShowSuccessModal(false);
    navigate('/shopping-list');
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  // Структурированные данные для главной страницы
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Mealtime Planner",
    "description": "Планировщик питания и рецептов с автоматической генерацией списков покупок",
    "url": "https://mealtime-planner.ru",
    "applicationCategory": "FoodApplication",
    "operatingSystem": "Web Browser",
    "permissions": "browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  const WelcomeBlock = () => (
    <div className="space-y-8">
      <SeoHead
        title="Mealtime Planner - Планировщик питания и рецептов"
        description="Планируйте питание на неделю, создавайте меню, генерируйте списки покупок. Умный планировщик питания с автоматической генерацией списков покупок."
        keywords="планировщик питания, рецепты, меню на неделю, список покупок, готовка, кулинария, meal planning"
        structuredData={structuredData}
      />

      {/* Герой-секция */}
      <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-8 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Планируйте питание с умом
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Создавайте идеальное меню на неделю и автоматически получайте список покупок
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
            >
              Начать планировать
            </button>
            <button
              onClick={() => navigate('/recipes')}
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:bg-opacity-10 transition-colors text-lg"
            >
              Посмотреть рецепты
            </button>
          </div>
        </div>
      </div>

      {/* Преимущества */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Планирование на неделю</h3>
          <p className="text-gray-600">Создавайте сбалансированное меню на всю неделю вперед</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
          <div className="text-4xl mb-4">🛒</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Автоматический список покупок</h3>
          <p className="text-gray-600">Система сама составит оптимизированный список покупок</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
          <div className="text-4xl mb-4">🍳</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Библиотека рецептов</h3>
          <p className="text-gray-600">Доступ к сотням проверенных рецептов на любой вкус</p>
        </div>
      </div>

      {/* Демо календаря для неавторизованных */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Пример планировщика питания
        </h2>
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
              <div key={day} className="text-center p-2 bg-white rounded border">
                <div className="font-semibold text-gray-900">{day}</div>
                <div className="text-gray-500 text-xs mt-1">Завтрак</div>
                <div className="text-gray-500 text-xs">Обед</div>
                <div className="text-gray-500 text-xs">Ужин</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-gray-600 text-center">
          После регистрации вы получите доступ к полнофункциональному планировщику
        </p>
      </div>

      {/* Как это работает */}
      <div className="bg-gray-50 rounded-2xl p-8 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Как это работает?</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">1</div>
            <p className="font-semibold">Зарегистрируйтесь</p>
            <p className="text-sm text-gray-600 mt-1">Бесплатно и за 2 минуты</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">2</div>
            <p className="font-semibold">Выберите рецепты</p>
            <p className="text-sm text-gray-600 mt-1">Из нашей обширной коллекции</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">3</div>
            <p className="font-semibold">Запланируйте на неделю</p>
            <p className="text-sm text-gray-600 mt-1">Расставьте приемы пищи в календаре</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">4</div>
            <p className="font-semibold">Получите список покупок</p>
            <p className="text-sm text-gray-600 mt-1">Автоматически сгенерированный</p>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/register')}
            className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors text-lg"
          >
            Попробовать бесплатно
          </button>
        </div>
      </div>

      {/* SEO текст */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Mealtime Planner - ваш персональный помощник в планировании питания</h2>
        <div className="prose max-w-none text-gray-700">
          <p className="mb-4">
            Добро пожаловать в <strong>Mealtime Planner</strong> - современный инструмент для планирования питания, который поможет вам организовать
            процесс готовки и покупки продуктов. Больше не нужно тратить время на составление списков покупок вручную - наша система сделает это за вас!
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Почему выбирают наш планировщик?</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Экономия времени</strong> - автоматическая генерация списков покупок</li>
            <li><strong>Разнообразное питание</strong> - доступ к большой коллекции рецептов</li>
            <li><strong>Экономия денег</strong> - покупайте только нужные продукты</li>
            <li><strong>Удобное планирование</strong> - интуитивный недельный календарь</li>
            <li><strong>Для всей семьи</strong> - учитывайте предпочтения каждого</li>
          </ul>

          <p>
            Начните использовать Mealtime Planner уже сегодня и убедитесь, насколько проще может быть организация питания для вас и вашей семьи!
          </p>
        </div>
      </div>
    </div>
  );

  // Если неавторизован - показываем WelcomeBlock
  if (!isAuthenticated) {
    return <WelcomeBlock />;
  }

  // Если авторизован, но данные еще загружаются
  if (isLoading && !previousWeekRange.current) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 bg-red-50 rounded-lg p-4 max-w-md mx-auto">
          {error}
        </div>
      </div>
    );
  }

  const getDayText = (count: number) => {
    if (count === 1) return 'день';
    if (count >= 2 && count <= 4) return 'дня';
    return 'дней';
  };

  // Основной интерфейс для авторизованных пользователей
  return (
    <div className="space-y-6">
      {/* SEO КОМПОНЕНТ */}
      <SeoHead
        title="Планировщик питания на неделю - Умное планирование меню"
        description="Создайте идеальное меню на неделю с нашим планировщиком питания. Автоматическая генерация списков покупок, подбор рецептов, учет калорий и времени приготовления."
        keywords="планировщик питания, меню на неделю, список покупок, рецепты, готовка, meal prep, планирование питания"
        structuredData={structuredData}
      />

      {/* H1 ЗАГОЛОВОК ДЛЯ SEO */}
      <div className="sr-only">
        <h1>Планировщик питания Mealtime Planner - Умное планирование меню на неделю</h1>
      </div>

      <InstructionBlock />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">План питания</h2>
          <p className="text-gray-600 mt-1">Планируйте приемы пищи на неделю</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => handleWeekChange('prev')}
            className="btn-secondary flex items-center"
          >
            ← Предыдущая неделя
          </button>

          <button
            onClick={() => handleWeekChange('next')}
            className="btn-secondary flex items-center"
          >
            Следующая неделя →
          </button>

          {/* Всегда видимая кнопка */}
          <button
            onClick={handleGenerateShoppingList}
            className="btn-accent hover:bg-accent-600 transform hover:scale-105 flex items-center transition-all duration-200"
          >
            🛒 Сформировать список покупок
            {selectedDays.length > 0 && (
              <span className="ml-2 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                {selectedDays.length} {getDayText(selectedDays.length)}
              </span>
            )}
          </button>

          {/* Подсказка для пользователя */}
          {selectedDays.length === 0 && (
            <div className="text-sm text-neutral-500 flex items-center">
              <span className="mr-2">📌</span>
              Выберите дни для формирования списка покупок
            </div>
          )}
        </div>
      </div>

      {/* Показываем ошибку, если есть */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Внимание
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{error}</p>
                <p className="mt-1">
                  Проверьте, запущен ли бэкенд на localhost:8000
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Используем адаптивный календарь */}
      <AdaptiveWeekCalendar
        currentDate={currentDate}
        mealPlans={mealPlans}
        onDateSelect={handleDateSelect}
        onAddMeal={handleAddMeal}
        onRemoveRecipe={handleRemoveRecipe}
        selectedDays={selectedDays}
      />

      {/* SEO ТЕКСТ ДЛЯ ПОИСКОВИКОВ */}
      <div className="bg-white rounded-lg p-6 mt-8 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Планировщик питания для всей семьи</h2>
        <div className="prose max-w-none text-gray-700">
          <p className="mb-4">
            <strong>Mealtime Planner</strong> - это современный инструмент для планирования питания, который поможет вам:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>Создавать сбалансированное меню на неделю вперед</li>
            <li>Автоматически генерировать списки покупок на основе выбранных рецептов</li>
            <li>Экономить время и деньги, избегая лишних покупок</li>
            <li>Питаться разнообразно и полезно каждый день</li>
            <li>Учитывать предпочтения всех членов семьи</li>
          </ul>
          <p>
            Наш планировщик подходит для семей с детьми, людей на диете, приверженцев здорового питания
            и всех, кто хочет упростить процесс готовки и покупки продуктов.
          </p>
        </div>
      </div>

      {showRecipeModal && (
        <RecipeModal
          isOpen={showRecipeModal}
          onClose={() => setShowRecipeModal(false)}
          onRecipeSelect={handleRecipeSelect}
          mealType={selectedMealType}
          selectedDate={selectedDate}
        />
      )}

      {/* Модальное окно успеха */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleContinue}
        onContinue={handleContinue}
        onGoToList={handleGoToList}
      />

      {/* Модальное окно предупреждения */}
      <WarningModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
      />
    </div>
  );
};

export default CalendarPage;