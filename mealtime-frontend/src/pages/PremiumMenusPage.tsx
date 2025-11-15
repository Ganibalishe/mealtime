// PremiumMenusPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePremiumMenuStore } from '../stores/premiumMenuStore';
import { usePaymentStore } from '../stores/paymentStore';
import { useAuth } from '../hooks/useAuth';
import type { PremiumMenuFilters } from '../types';
import SeoHead from '../components/SeoHead';
import CreatePlanModal from '../components/CreatePlanModal';
import { robokassaService } from '../services/robokassa';

const PremiumMenusPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuth();

  const {
    filteredMenus,
    isLoading,
    error,
    applyFilters,
    loadMenus,
    activateMenu,
    createMealPlanFromDate,
    nextPage,
    loadNextPage,
    isLoadingMore,
    isSearchLoading,
    clearError,
    clearFilters
  } = usePremiumMenuStore();

  const {
    createPayment,
    paymentLoading,
    paymentError,
    cancelPurchase,
    cancelLoading,
    clearPaymentError
  } = usePaymentStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [durationRange, setDurationRange] = useState<{ min: number | ''; max: number | '' }>({ min: '', max: '' });
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [activationLoading, setActivationLoading] = useState<string | null>(null);
  const [paymentMenuId, setPaymentMenuId] = useState<string | null>(null);

  // Состояния для модального окна создания плана
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [selectedMenuForPlan, setSelectedMenuForPlan] = useState<{id: string, name: string, duration: number} | null>(null);
  const [createPlanLoading, setCreatePlanLoading] = useState<string | null>(null);

  const searchTimeoutRef = useRef<number | null>(null);

  // Восстановление фильтров из localStorage и загрузка данных
  useEffect(() => {
    const savedFilters = localStorage.getItem('premiumMenuFilters');
    if (savedFilters) {
      const { searchQuery: savedSearch, selectedTags: savedTags, durationRange: savedRange, showFreeOnly: savedFree } = JSON.parse(savedFilters);
      setSearchQuery(savedSearch || '');
      setSelectedTags(savedTags || []);
      setDurationRange(savedRange || { min: '', max: '' });
      setShowFreeOnly(savedFree || false);
    }

    const initializeData = async () => {
      await loadMenus();
      setHasInitialized(true);
    };

    initializeData();
  }, [loadMenus]);

  // Сохранение фильтров в localStorage
  useEffect(() => {
    const filters = { searchQuery, selectedTags, durationRange, showFreeOnly };
    localStorage.setItem('premiumMenuFilters', JSON.stringify(filters));
  }, [searchQuery, selectedTags, durationRange, showFreeOnly]);

  // Применение фильтров с debounce
  useEffect(() => {
    if (!hasInitialized) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    searchTimeoutRef.current = setTimeout(() => {
      const filters: PremiumMenuFilters = {};

      if (searchQuery.trim()) {
        filters.q = searchQuery;
      }

      if (selectedTags.length > 0) {
        filters.tags = selectedTags;
      }

      if (showFreeOnly) {
        filters.is_free = true;
      }

      if (durationRange.min) {
        filters.duration_min = durationRange.min;
      }

      if (durationRange.max) {
        filters.duration_max = durationRange.max;
      }

      if (Object.keys(filters).length > 0) {
        applyFilters(filters);
      } else {
        clearFilters();
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedTags, showFreeOnly, durationRange, hasInitialized, applyFilters, clearFilters]);

  // Загрузка дополнительных меню
  const handleLoadMore = async () => {
    if (!nextPage || isLoadingMore) return;
    await loadNextPage();
  };

  const handleActivateMenu = async (menuId: string) => {
    setActivationLoading(menuId);
    clearError();
    clearPaymentError();

    try {
      await activateMenu(menuId);
      // Можно добавить уведомление об успешной активации
    } catch (err: any) {
      console.error('Ошибка активации меню:', err.message);
    } finally {
      setActivationLoading(null);
    }
  };

  // Обработчик платежа через Robokassa
  const handlePayment = async (menuId: string) => {
    setPaymentMenuId(menuId);
    clearError();
    clearPaymentError();

    try {
      // Загружаем скрипт Robokassa
      await robokassaService.loadScript();

      // Получаем параметры платежа с бэкенда
      const paymentData = await createPayment(menuId);

      // Запускаем платеж - теперь payment_params правильного типа
      robokassaService.startPayment(paymentData.payment_params);

    } catch (error: any) {
      console.error('Ошибка при запуске платежа:', error.message);
    } finally {
      setPaymentMenuId(null);
    }
  };

  // Обработчик отмены покупки и повторной покупки
  const handleCancelAndRetry = async (menuId: string) => {
    setPaymentMenuId(menuId);
    clearError();
    clearPaymentError();

    try {
      // Отменяем текущую покупку
      await cancelPurchase(menuId);

      // Перезагружаем меню, чтобы обновить статус
      await loadMenus();

      // Сразу создаем новый платеж
      await handlePayment(menuId);
    } catch (error: any) {
      console.error('Ошибка при отмене и повторной покупке:', error.message);
      setPaymentMenuId(null);
    }
  };
  // Обработчик открытия модального окна создания плана
  const handleOpenCreatePlanModal = (menuId: string, menuName: string, durationDays: number) => {
    setSelectedMenuForPlan({ id: menuId, name: menuName, duration: durationDays });
    setIsCreatePlanModalOpen(true);
  };

  // Обработчик создания плана питания
  const handleCreatePlanSubmit = async (startDate: string, portions: number) => {
    if (!selectedMenuForPlan) return;

    setCreatePlanLoading(selectedMenuForPlan.id);
    clearError();
    clearPaymentError();

    try {
      await createMealPlanFromDate(selectedMenuForPlan.id, startDate, portions);
      // Закрываем модальное окно и переходим в календарь
      setIsCreatePlanModalOpen(false);
      setSelectedMenuForPlan(null);
      navigate('/'); // Переходим на главную (календарь)
    } catch (err: any) {
      console.error('Ошибка создания плана питания:', err.message);
    } finally {
      setCreatePlanLoading(null);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setDurationRange({ min: '', max: '' });
    setShowFreeOnly(false);
    clearFilters();
    clearPaymentError();
  };

  // Получаем все уникальные теги из меню
  const allTags = Array.from(
    new Set(
      filteredMenus.flatMap(menu =>
        menu.tags.map(tag => tag.id)
      )
    )
  ).map(tagId => {
    const tag = filteredMenus.flatMap(menu => menu.tags).find(t => t.id === tagId);
    return tag!;
  });

  const hasActiveFilters = selectedTags.length > 0 || durationRange.min || durationRange.max || showFreeOnly || searchQuery;
  const isSearching = isSearchLoading && hasActiveFilters;

  // Структурированные данные для SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Готовые меню питания на неделю | Mealtime Planner",
    "description": "Профессионально составленные меню питания на неделю. Сбалансированные рационы для здоровья и удобства.",
    "numberOfItems": filteredMenus.length,
    "itemListElement": filteredMenus.slice(0, 10).map((menu, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": menu.name,
        "description": menu.description,
        "offers": {
          "@type": "Offer",
          "price": menu.price || "0",
          "priceCurrency": "RUB"
        }
      }
    }))
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* SEO КОМПОНЕНТ */}
      <SeoHead
        title="Готовые меню питания - Выберите готовое меню на неделю | Mealtime Planner"
        description="Выберите готовое меню питания на неделю от профессиональных диетологов. Не нужно планировать - просто выберите подходящее меню на 7, 14, 21 или 30 дней. Все рецепты уже подобраны, сбалансированы и готовы к использованию. После покупки меню вы можете активировать его и добавить все рецепты в свой календарь питания одним кликом. Автоматически создастся список покупок."
        keywords="готовые меню, питание на неделю, рационы, планирование питания, сбалансированное меню, премиум меню, меню на 7 дней, меню на 14 дней, меню на 21 день, меню на 30 дней, готовое меню с рецептами, список покупок, meal plan, готовые рационы, выбрать меню"
        canonicalUrl="https://mealtime-planner.ru/premium-menus"
        structuredData={structuredData}
      />

      {/* H1 ЗАГОЛОВОК ДЛЯ SEO - видимый для пользователей */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Готовые меню питания на неделю</h1>
        <p className="text-gray-600 text-lg">Профессионально составленные рационы для вашего удобства</p>
      </div>

      {/* Сообщение об ошибке платежа */}
      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-700 text-sm mb-2">{paymentError}</div>
          <button
            onClick={clearPaymentError}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Поиск и фильтры */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        {/* Строка поиска */}
        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Поиск меню по названию или описанию..."
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Фильтр по длительности */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Длительность меню (дни):
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="От"
                value={durationRange.min}
                onChange={(e) => setDurationRange(prev => ({ ...prev, min: e.target.value ? parseInt(e.target.value) : '' }))}
                className="input-field w-full py-2"
                min="1"
                max="30"
              />
              <input
                type="number"
                placeholder="До"
                value={durationRange.max}
                onChange={(e) => setDurationRange(prev => ({ ...prev, max: e.target.value ? parseInt(e.target.value) : '' }))}
                className="input-field w-full py-2"
                min="1"
                max="30"
              />
            </div>
          </div>

          {/* Фильтр бесплатных меню */}
          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFreeOnly}
                onChange={(e) => setShowFreeOnly(e.target.checked)}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Только бесплатные меню</span>
            </label>
          </div>

          {/* Кнопка сброса */}
          <div className="flex items-end justify-end">
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
        {allTags.length > 0 && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Фильтр по тегам:
            </label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTags(prev =>
                    prev.includes(tag.id)
                      ? prev.filter(id => id !== tag.id)
                      : [...prev, tag.id]
                  )}
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
              ))}
            </div>
          </div>
        )}

        {/* Статус поиска */}
        {isSearching && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center text-blue-700 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
              Ищем меню по вашему запросу...
            </div>
          </div>
        )}
      </div>

      {/* Состояние загрузки */}
      {isLoading && !hasActiveFilters && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600">Загрузка меню...</span>
        </div>
      )}

      {/* Сообщение об ошибке */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-700 text-sm">{error}</div>
          <button
            onClick={clearError}
            className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Список меню */}
      {!isLoading && (
        <>
          {filteredMenus.length > 0 ? (
            <>
              {/* Информация о результатах поиска */}
              {hasActiveFilters && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-green-700 text-sm">
                    Найдено {filteredMenus.length} меню по вашему запросу
                    {searchQuery && ` по запросу "${searchQuery}"`}
                    {showFreeOnly && ` (только бесплатные)`}
                    {durationRange.min && durationRange.max && ` длительностью ${durationRange.min}-${durationRange.max} дней`}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenus.map(menu => {
                  const isPaid = menu.is_purchased && menu.purchase_status === 'paid';
                  const isProcessing = menu.purchase_status === 'processing';
                  const isCurrentPayment = paymentMenuId === menu.id;
                  const isCurrentActivation = activationLoading === menu.id;
                  const isCurrentPlanCreation = createPlanLoading === menu.id;

                  return (
                    <div
                      key={menu.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 group"
                    >
                      {/* Карточка меню */}
                      <div className="p-4">
                        {/* Заголовок и описание */}
                        <div className="mb-3">
                          <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                            {menu.name}
                          </h3>
                          {menu.description && (
                            <p className="text-gray-600 text-sm line-clamp-3">
                              {menu.description}
                            </p>
                          )}
                        </div>

                        {/* Цена и длительность */}
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center space-x-2">
                            <span className={`text-lg font-bold ${
                              menu.is_free ? 'text-green-600' : 'text-accent-600'
                            }`}>
                              {menu.is_free ? 'Бесплатно' : `${menu.price} ₽`}
                            </span>
                          </div>
                          <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs">
                            {menu.duration_days} дней
                          </span>
                        </div>

                        {/* Теги */}
                        {menu.tags && menu.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {menu.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag.id}
                                className="px-2 py-1 rounded-full text-xs text-white"
                                style={{ backgroundColor: tag.color || '#6B7280' }}
                              >
                                {tag.name}
                              </span>
                            ))}
                            {menu.tags.length > 3 && (
                              <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600">
                                +{menu.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Информация о рецептах */}
                        <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                          <span>🍽️ {menu.recipes_count} рецептов</span>
                          <span>{menu.premium_recipes.length} приемов пищи</span>
                        </div>

                        {/* Кнопки действий - ОБНОВЛЕННЫЕ С ROBOKASSA */}
                        <div className="space-y-2">
                          {!isAuthenticated ? (
                            <>
                              <button
                                onClick={() => navigate(`/premium-menus/${menu.id}`)}
                                className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 text-sm font-medium"
                              >
                                Подробнее
                              </button>
                              <div className="text-center">
                                <span className="text-yellow-600 text-xs">⚠️ Требуется авторизация</span>
                              </div>
                            </>
                          ) : isPaid ? (
                            <>
                              <button
                                onClick={() => handleOpenCreatePlanModal(menu.id, menu.name, menu.duration_days)}
                                disabled={isCurrentPlanCreation}
                                className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              >
                                {isCurrentPlanCreation ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Создание...</span>
                                  </div>
                                ) : (
                                  'Создать план питания'
                                )}
                              </button>

                              <button
                                onClick={() => navigate(`/premium-menus/${menu.id}`)}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors duration-200 text-sm font-medium"
                              >
                                Подробнее о меню
                              </button>

                              <div className="text-center">
                                <span className="text-green-600 text-xs">✓ Меню активировано</span>
                              </div>
                            </>
                          ) : isProcessing ? (
                            <>
                              <button
                                onClick={() => handleCancelAndRetry(menu.id)}
                                disabled={cancelLoading || (paymentMenuId === menu.id && paymentLoading)}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              >
                                {cancelLoading || (paymentMenuId === menu.id && paymentLoading) ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                    <span>Обработка...</span>
                                  </div>
                                ) : (
                                  'Отменить и купить заново'
                                )}
                              </button>

                              <button
                                onClick={() => navigate(`/premium-menus/${menu.id}`)}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors duration-200 text-sm font-medium"
                              >
                                Подробнее о меню
                              </button>

                              <div className="text-center">
                                <span className="text-yellow-600 text-xs">⏳ Платеж в обработке. Если вы не завершили оплату, нажмите кнопку выше</span>
                              </div>
                            </>
                          ) : menu.is_free ? (
                            <>
                              <button
                                onClick={() => handleActivateMenu(menu.id)}
                                disabled={isCurrentActivation}
                                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              >
                                {isCurrentActivation ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Активация...</span>
                                  </div>
                                ) : (
                                  'Активировать бесплатно'
                                )}
                              </button>

                              <button
                                onClick={() => navigate(`/premium-menus/${menu.id}`)}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors duration-200 text-sm font-medium"
                              >
                                Подробнее о меню
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handlePayment(menu.id)}
                                disabled={isCurrentPayment}
                                className="w-full bg-accent-500 hover:bg-accent-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              >
                                {isCurrentPayment ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Подготовка платежа...</span>
                                  </div>
                                ) : (
                                  `Купить за ${menu.price} ₽`
                                )}
                              </button>

                              <button
                                onClick={() => navigate(`/premium-menus/${menu.id}`)}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors duration-200 text-sm font-medium"
                              >
                                Подробнее о меню
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Ховер-эффект */}
                      <div className="bg-primary-50 bg-opacity-0 group-hover:bg-opacity-100 transition-all duration-200 px-4 py-3 border-t border-gray-100">
                        <div className="text-primary-600 text-sm font-medium">
                          {!isAuthenticated
                            ? 'Доступно после авторизации'
                            : isPaid
                              ? 'Готово к использованию'
                              : isProcessing
                                ? 'Ожидает подтверждения оплаты'
                                : 'Доступно для активации'
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Кнопка загрузки дополнительных меню */}
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
                          <span>📥 Загрузить еще меню</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-sm text-gray-500 mt-3">
                      Показано {filteredMenus.length} меню
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Сообщение, если меню нет */
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">
                {hasActiveFilters
                  ? 'Меню по вашему запросу не найдены. Попробуйте изменить фильтры.'
                  : 'Готовые меню пока не добавлены'
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
        <h2 className="text-xl font-bold text-gray-900 mb-4">Профессионально составленные меню питания на неделю</h2>
        <div className="prose max-w-none text-gray-700">
          <p className="mb-4">
            Наша коллекция <strong>готовых меню питания</strong> создана профессиональными диетологами и шеф-поварами.
            Каждое меню представляет собой сбалансированный рацион на определенное количество дней,
            учитывающий все необходимые питательные вещества для поддержания здоровья и энергии.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Преимущества готовых меню:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Экономия времени</strong> - не нужно тратить часы на планирование питания и поиск рецептов</li>
            <li><strong>Сбалансированный рацион</strong> - все меню составлены с учетом норм БЖУ и калорийности</li>
            <li><strong>Разнообразие</strong> - меню для разных целей: похудение, поддержание веса, спорт, здоровое питание</li>
            <li><strong>Автоматизация</strong> - после активации меню автоматически создается план питания и список покупок</li>
            <li><strong>Гибкость</strong> - бесплатные и премиальные варианты на любой бюджет</li>
            <li><strong>Безопасная оплата</strong> - все платежи защищены через Robokassa</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-3">Как работают готовые меню:</h3>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Выбираете подходящее меню из каталога</li>
            <li>Активируете меню (бесплатно или через безопасную оплату)</li>
            <li>Создаете план питания на выбранную дату</li>
            <li>Получаете автоматически сгенерированный список покупок</li>
            <li>Наслаждаетесь вкусной и здоровой пищей всю неделю</li>
          </ol>

          <h3 className="text-lg font-semibold mt-6 mb-3">Безопасность платежей:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>Все платежи обрабатываются через защищенный шлюз Robokassa</li>
            <li>Поддержка банковских карт и системы быстрых платежей (СБП)</li>
            <li>Данные карт защищены по стандарту PCI DSS</li>
            <li>Мгновенное подтверждение оплаты</li>
            <li>Возможность возврата средств согласно законодательству</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-3">Категории меню:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Классическое сбалансированное питание</strong> - универсальные меню для всей семьи</li>
            <li><strong>Фитнес и спорт</strong> - повышенное содержание белка для активного образа жизни</li>
            <li><strong>Здоровое питание</strong> - меню с акцентом на полезные продукты и щадящую обработку</li>
            <li><strong>Бюджетные варианты</strong> - экономичные меню с доступными ингредиентами</li>
            <li><strong>Сезонные меню</strong> - рационы с учетом сезонных продуктов</li>
          </ul>

          <div className="bg-primary-50 p-4 rounded-lg mt-6">
            <p className="text-primary-800 text-sm">
              <strong>💡 Совет:</strong> Начните с бесплатных меню, чтобы оценить удобство системы.
              После активации меню автоматически появится в вашем календаре питания,
              а список покупок будет сгенерирован с учетом всех ингредиентов.
              Для платных меню доступна безопасная оплата через Robokassa с поддержкой карт и СБП.
            </p>
          </div>
        </div>
      </div>

      {/* Модальное окно создания плана питания */}
      <CreatePlanModal
        isOpen={isCreatePlanModalOpen}
        onClose={() => {
          setIsCreatePlanModalOpen(false);
          setSelectedMenuForPlan(null);
        }}
        onSubmit={handleCreatePlanSubmit}
        isLoading={!!createPlanLoading}
        menuName={selectedMenuForPlan?.name || ''}
        durationDays={selectedMenuForPlan?.duration || 0}
      />
    </div>
  );
};

export default PremiumMenusPage;