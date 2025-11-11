// PremiumMenuDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePremiumMenuStore } from '../stores/premiumMenuStore';
import { usePaymentStore } from '../stores/paymentStore';
import { useAuth } from '../hooks/useAuth';
import SeoHead from '../components/SeoHead';
import CreatePlanModal from '../components/CreatePlanModal';
import { robokassaService } from '../services/robokassa';

const PremiumMenuDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuth();

  const {
    currentMenu,
    currentMenuLoading,
    currentMenuError,
    loadMenuById,
    clearCurrentMenu,
    activateMenu,
    createMealPlanFromDate
  } = usePremiumMenuStore();

  const {
    createPayment,
    paymentLoading,
    paymentError,
    clearPaymentError
  } = usePaymentStore();

  const [activationLoading, setActivationLoading] = useState(false);

  // Состояния для модального окна создания плана
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [createPlanLoading, setCreatePlanLoading] = useState(false);

  // Загрузка данных меню
  useEffect(() => {
    if (id) {
      loadMenuById(id);
    }

    return () => {
      clearCurrentMenu();
    };
  }, [id, loadMenuById, clearCurrentMenu]);

  // Обработчики действий
  const handleActivateMenu = async () => {
    if (!currentMenu || !isAuthenticated) return;

    setActivationLoading(true);
    try {
      await activateMenu(currentMenu.id);
      // Успешная активация - меню автоматически обновится в store
    } catch (error: any) {
      console.error('Ошибка активации меню:', error.message);
    } finally {
      setActivationLoading(false);
    }
  };

  // Обработчик платежа через Robokassa
  const handlePayment = async () => {
    if (!currentMenu || !isAuthenticated) return;

    clearPaymentError();

    try {
      // Загружаем скрипт Robokassa
      await robokassaService.loadScript();

      // Получаем параметры платежа с бэкенда
      const paymentData = await createPayment(currentMenu.id);

      // Запускаем платеж - теперь payment_params правильного типа
      robokassaService.startPayment(paymentData.payment_params);

    } catch (error: any) {
      console.error('Ошибка при запуске платежа:', error.message);
    }
  };

  // Обработчик открытия модального окна создания плана
  const handleOpenCreatePlanModal = () => {
    setIsCreatePlanModalOpen(true);
  };

  // Обработчик создания плана питания
  const handleCreatePlanSubmit = async (startDate: string, portions: number) => {
    if (!currentMenu) return;

    setCreatePlanLoading(true);
    try {
      await createMealPlanFromDate(currentMenu.id, startDate, portions);
      setIsCreatePlanModalOpen(false);
      navigate('/'); // Переходим на календарь после создания
    } catch (error: any) {
      console.error('Ошибка создания плана питания:', error.message);
    } finally {
      setCreatePlanLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login', { state: { from: `/premium-menus/${id}` } });
  };

  // Состояния загрузки и ошибок
  if (currentMenuLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600">Загрузка меню...</span>
        </div>
      </div>
    );
  }

  if (currentMenuError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-700 text-lg mb-4">{currentMenuError}</div>
          <Link to="/premium-menus" className="btn-primary">
            Вернуться к каталогу меню
          </Link>
        </div>
      </div>
    );
  }

  if (!currentMenu) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-4">Меню не найдено</div>
          <Link to="/premium-menus" className="btn-primary">
            Вернуться к каталогу меню
          </Link>
        </div>
      </div>
    );
  }

  // ОПРЕДЕЛЯЕМ СТАТУС ПОКУПКИ ДЛЯ ОТОБРАЖЕНИЯ ПРАВИЛЬНЫХ КНОПОК
  const isPaid = currentMenu.is_purchased && currentMenu.purchase_status === 'paid';
  const isProcessing = currentMenu.purchase_status === 'processing';
  const isCancelled = currentMenu.purchase_status === 'cancelled';

  // Пример рецептов (первые 3)
  const exampleRecipes = currentMenu.premium_recipes.slice(0, 3);

  // Структурированные данные для SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": currentMenu.name,
    "description": currentMenu.description,
    "offers": {
      "@type": "Offer",
      "price": currentMenu.price || "0",
      "priceCurrency": "RUB"
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* SEO КОМПОНЕНТ */}
      <SeoHead
        title={`${currentMenu.name} | Готовое меню питания`}
        description={currentMenu.description}
        keywords={`${currentMenu.name}, готовое меню, питание на ${currentMenu.duration_days} дней, ${currentMenu.tags.map(tag => tag.name).join(', ')}`}
        structuredData={structuredData}
      />

      {/* Хлебные крошки */}
      <nav className="mb-6 flex items-center space-x-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-primary-600 transition-colors">Главная</Link>
        <span>›</span>
        <Link to="/premium-menus" className="hover:text-primary-600 transition-colors">Готовые меню</Link>
        <span>›</span>
        <span className="text-gray-900">{currentMenu.name}</span>
      </nav>

      <div className="max-w-6xl mx-auto">
        {/* Основная информация о меню */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Левая колонка - информация */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{currentMenu.name}</h1>

              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                {currentMenu.description}
              </p>

              {/* Характеристики меню */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-primary-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600 mb-1">{currentMenu.duration_days}</div>
                  <div className="text-sm text-gray-600">дней</div>
                </div>
                <div className="text-center p-4 bg-primary-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600 mb-1">{currentMenu.recipes_count}</div>
                  <div className="text-sm text-gray-600">рецептов</div>
                </div>
                <div className="text-center p-4 bg-primary-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600 mb-1">
                    {currentMenu.premium_recipes.length}
                  </div>
                  <div className="text-sm text-gray-600">приемов пищи</div>
                </div>
                <div className="text-center p-4 bg-primary-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600 mb-1">
                    {currentMenu.is_free ? 'Бесплатно' : `${currentMenu.price} ₽`}
                  </div>
                  <div className="text-sm text-gray-600">стоимость</div>
                </div>
              </div>

              {/* Теги */}
              {currentMenu.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Теги меню:</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentMenu.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 rounded-full text-sm text-white"
                        style={{ backgroundColor: tag.color || '#6B7280' }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Правая колонка - действия */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 sticky top-6">
                <div className="text-center mb-6">
                  <div className={`text-3xl font-bold mb-2 ${
                    currentMenu.is_free ? 'text-green-600' : 'text-accent-600'
                  }`}>
                    {currentMenu.is_free ? 'Бесплатно' : `${currentMenu.price} ₽`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {currentMenu.duration_days} дней • {currentMenu.recipes_count} рецептов
                  </div>
                </div>

                {/* Сообщение об ошибке платежа */}
                {paymentError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-red-700 text-sm text-center">
                      {paymentError}
                    </div>
                    <button
                      onClick={clearPaymentError}
                      className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium w-full text-center"
                    >
                      Закрыть
                    </button>
                  </div>
                )}

                {/* Кнопки действий - ОБНОВЛЕННАЯ ЛОГИКА С ROBOKASSA */}
                {!isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-yellow-800 text-sm text-center">
                        Для покупки меню необходимо авторизоваться
                      </p>
                    </div>
                    <button
                      onClick={handleLoginRedirect}
                      className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 px-4 rounded-lg transition-colors duration-200 font-medium"
                    >
                      Войти в аккаунт
                    </button>
                    <Link
                      to="/register"
                      className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg transition-colors duration-200 font-medium text-center"
                    >
                      Зарегистрироваться
                    </Link>
                  </div>
                ) : isPaid ? (
                  // Меню оплачено - можно создавать план
                  <button
                    onClick={handleOpenCreatePlanModal}
                    disabled={createPlanLoading}
                    className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {createPlanLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Создание...</span>
                      </div>
                    ) : (
                      'Создать план питания'
                    )}
                  </button>
                ) : isProcessing ? (
                  // Платеж в обработке - дизейблим кнопку
                  <div className="space-y-3">
                    <button
                      disabled
                      className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg opacity-70 cursor-not-allowed font-medium"
                    >
                      Платеж в обработке
                    </button>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="text-yellow-700 text-xs text-center">
                        ⏳ Ожидает подтверждения оплаты
                      </div>
                    </div>
                  </div>
                ) : currentMenu.is_free ? (
                  // Бесплатное меню - активация
                  <button
                    onClick={handleActivateMenu}
                    disabled={activationLoading}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {activationLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Активация...</span>
                      </div>
                    ) : (
                      'Активировать бесплатно'
                    )}
                  </button>
                ) : (
                  // Платное меню - оплата через Robokassa
                  <button
                    onClick={handlePayment}
                    disabled={paymentLoading}
                    className="w-full bg-accent-500 hover:bg-accent-600 text-white py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {paymentLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Подготовка платежа...</span>
                      </div>
                    ) : (
                      `Купить за ${currentMenu.price} ₽`
                    )}
                  </button>
                )}

                {/* Статус меню - ОБНОВЛЕННЫЕ СООБЩЕНИЯ */}
                {isAuthenticated && isPaid && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-green-700 text-sm text-center">
                      ✓ Меню активировано и готово к использованию
                    </div>
                  </div>
                )}

                {isAuthenticated && isProcessing && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="text-yellow-700 text-sm text-center">
                      ⏳ Ожидаем подтверждения платежа от платежной системы
                    </div>
                  </div>
                )}

                {isAuthenticated && isCancelled && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-red-700 text-sm text-center">
                      ❌ Платеж был отменен. Попробуйте снова.
                    </div>
                  </div>
                )}

                {/* Дополнительная информация */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>✅ Сбалансированное питание</span>
                    </div>
                    <div className="flex justify-between">
                      <span>✅ Список покупок</span>
                    </div>
                    <div className="flex justify-between">
                      <span>✅ Подробные рецепты</span>
                    </div>
                    <div className="flex justify-between">
                      <span>✅ Поддержка 24/7</span>
                    </div>
                    {!currentMenu.is_free && (
                      <div className="flex justify-between">
                        <span>🔒 Безопасная оплата через Robokassa</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Пример рецептов из меню */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Пример рецептов из меню</h2>

          {exampleRecipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {exampleRecipes.map(recipePlan => (
                <div
                  key={recipePlan.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                >
                  {/* Изображение рецепта */}
                  {recipePlan.recipe_image && (
                    <div className="h-48 bg-gray-200 overflow-hidden">
                      <img
                        src={recipePlan.recipe_image}
                        alt={recipePlan.recipe_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Информация о рецепте */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                        {recipePlan.recipe_name}
                      </h3>
                    </div>

                    {/* Мета-информация */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <span className="flex items-center">
                        ⏱️ {recipePlan.recipe_cooking_time} мин
                      </span>
                      <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs">
                        {recipePlan.meal_type_display}
                      </span>
                    </div>

                    {/* День меню */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">День {recipePlan.day_number}</span>
                        <span className="mx-2">•</span>
                        <span>{recipePlan.meal_type_display}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Информация о рецептах временно недоступна
            </div>
          )}

          {/* Ссылка на все рецепты */}
          {currentMenu.premium_recipes.length > 3 && (
            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-600 mb-4">
                И еще {currentMenu.premium_recipes.length - 3} рецептов в этом меню
              </p>
            </div>
          )}
        </div>

        {/* Подробное описание меню */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">О меню</h2>

          <div className="prose max-w-none text-gray-700">
            <p className="mb-4">
              Это профессионально составленное меню на <strong>{currentMenu.duration_days} дней</strong>,
              включающее <strong>{currentMenu.recipes_count} разнообразных рецептов</strong>.
              Каждое блюдо тщательно подобрано для обеспечения сбалансированного питания.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">Что вас ждет:</h3>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Сбалансированное соотношение белков, жиров и углеводов</li>
              <li>Разнообразные приемы пищи: завтраки, обеды, ужины и перекусы</li>
              <li>Подробные пошаговые инструкции для каждого рецепта</li>
              <li>Точные списки покупок с учетом всех ингредиентов</li>
              <li>Рекомендации по порциям и времени приготовления</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">После активации меню:</h3>
            <ol className="list-decimal list-inside space-y-2 mb-4">
              <li>Все рецепты автоматически появятся в вашей библиотеке</li>
              <li>Вы сможете создать план питания на любую дату</li>
              <li>Система сгенерирует оптимизированный список покупок</li>
              <li>Доступ к меню сохраняется навсегда</li>
            </ol>

            {!currentMenu.is_free && (
              <>
                <h3 className="text-lg font-semibold mt-6 mb-3">Безопасная оплата:</h3>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Оплата через защищенный шлюз Robokassa</li>
                  <li>Поддержка банковских карт и СБП</li>
                  <li>Все данные защищены по стандарту PCI DSS</li>
                  <li>Мгновенное подтверждение оплаты</li>
                </ul>
              </>
            )}

            <div className="bg-primary-50 p-4 rounded-lg mt-6">
              <p className="text-primary-800 text-sm">
                <strong>💡 Совет:</strong> После активации меню вы можете использовать его многократно
                и создавать планы питания на разные периоды. Все купленные меню остаются в вашем аккаунте навсегда.
              </p>
            </div>
          </div>
        </div>

        {/* Навигация - ОБНОВЛЕННАЯ ЛОГИКА КНОПОК */}
        <div className="flex justify-between items-center mt-8 pt-8 border-t border-gray-200">
          <Link
            to="/premium-menus"
            className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2"
          >
            ← Вернуться к каталогу меню
          </Link>

          {/* Правая кнопка в зависимости от статуса */}
          {isAuthenticated && !isPaid && !isProcessing && currentMenu.is_free && (
            <button
              onClick={handleActivateMenu}
              disabled={activationLoading}
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {activationLoading ? 'Активация...' : 'Активировать бесплатно'}
            </button>
          )}

          {isAuthenticated && !isPaid && !isProcessing && !currentMenu.is_free && (
            <button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="bg-accent-500 hover:bg-accent-600 text-white py-2 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {paymentLoading ? 'Подготовка...' : `Купить за ${currentMenu.price} ₽`}
            </button>
          )}

          {isAuthenticated && isPaid && (
            <button
              onClick={handleOpenCreatePlanModal}
              disabled={createPlanLoading}
              className="bg-primary-500 hover:bg-primary-600 text-white py-2 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {createPlanLoading ? 'Создание...' : 'Создать план питания'}
            </button>
          )}

          {isAuthenticated && isProcessing && (
            <button
              disabled
              className="bg-yellow-500 text-white py-2 px-6 rounded-lg opacity-70 cursor-not-allowed font-medium"
            >
              Платеж в обработке
            </button>
          )}
        </div>
      </div>

      {/* Модальное окно создания плана питания */}
      {currentMenu && (
        <CreatePlanModal
          isOpen={isCreatePlanModalOpen}
          onClose={() => setIsCreatePlanModalOpen(false)}
          onSubmit={handleCreatePlanSubmit}
          isLoading={createPlanLoading}
          menuName={currentMenu.name}
          durationDays={currentMenu.duration_days}
        />
      )}
    </div>
  );
};

export default PremiumMenuDetailPage;