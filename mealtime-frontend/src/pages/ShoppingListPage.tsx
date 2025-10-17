import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useShoppingListStore } from '../stores/shoppingListStore';
import { useAuth } from '../hooks/useAuth'; // Добавляем хук авторизации

const ShoppingListPage: React.FC = () => {
  const { shoppingLists, isLoading, error, loadShoppingLists } = useShoppingListStore();
  const isAuthenticated = useAuth(); // Проверяем авторизацию

  useEffect(() => {
    if (isAuthenticated) {
      loadShoppingLists();
    }
  }, [loadShoppingLists, isAuthenticated]);

  // Блок для неавторизованных пользователей
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Заголовок */}
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Умные списки покупок
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Автоматически генерируйте списки покупок на основе вашего плана питания
          </p>

          {/* Преимущества */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="text-3xl mb-4">🛒</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Автоматическая генерация</h3>
              <p className="text-gray-600 text-sm">
                Система сама составит список покупок на основе выбранных рецептов
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Умное объединение</h3>
              <p className="text-gray-600 text-sm">
                Одинаковые ингредиенты из разных рецептов автоматически суммируются
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="text-3xl mb-4">✅</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Отслеживание прогресса</h3>
              <p className="text-gray-600 text-sm">
                Отмечайте купленные продукты и следите за прогрессом
              </p>
            </div>
          </div>

          {/* Призыв к действию */}
          <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-8 text-white mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Начните планировать покупки с умом!
            </h2>
            <p className="text-lg opacity-90 mb-6">
              Присоединяйтесь к тысячам пользователей, которые экономят время и деньги
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
              >
                Зарегистрироваться
              </Link>
              <Link
                to="/login"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:bg-opacity-10 transition-colors text-lg"
              >
                Войти в аккаунт
              </Link>
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="bg-gray-50 rounded-lg p-6 text-left">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Как это работает?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">1. Планируйте питание</h4>
                <p className="text-gray-600 text-sm">
                  Выбирайте рецепты и распределяйте их по дням недели в нашем удобном календаре
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">2. Генерируйте список</h4>
                <p className="text-gray-600 text-sm">
                  Система автоматически создаст оптимизированный список покупок на основе вашего плана
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">3. Покупайте с умом</h4>
                <p className="text-gray-600 text-sm">
                  Список сгруппирован по категориям продуктов для удобства в магазине
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">4. Отслеживайте прогресс</h4>
                <p className="text-gray-600 text-sm">
                  Отмечайте купленные товары и видите свой прогресс в реальном времени
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Оригинальный код для авторизованных пользователей
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Ошибка: {error}</div>
        <button
          onClick={loadShoppingLists}
          className="bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Списки покупок</h1>

      {shoppingLists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">У вас пока нет списков покупок.</p>
          <Link
            to="/"
            className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Создать список из календаря
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shoppingLists.map((list) => (
            <Link
              key={list.id}
              to={`/shopping-list/${list.id}`}
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{list.name}</h2>
              <p className="text-gray-600 mb-2">
                Период: {new Date(list.period_start).toLocaleDateString()} - {new Date(list.period_end).toLocaleDateString()}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {list.items_checked} / {list.total_items} куплено
                </span>
                <span className="text-sm font-medium text-primary-600">
                  {Math.round(list.progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-primary-500 h-2 rounded-full"
                  style={{ width: `${list.progress}%` }}
                ></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShoppingListPage;