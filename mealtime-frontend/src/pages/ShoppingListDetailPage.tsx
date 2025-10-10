import type { ShoppingList, ShoppingListItem } from '../types'; // Добавь этот импорт
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useShoppingListStore } from '../stores/shoppingListStore';
import SeoHead from '../components/SeoHead';

const ShoppingListDetailPage: React.FC = () => {
  const isAuthenticated = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    currentShoppingList,
    isLoading,
    error,
    loadShoppingListById,
    toggleShoppingListItem
  } = useShoppingListStore();

  useEffect(() => {
    if (id) {
      loadShoppingListById(id);
    }
  }, [id, loadShoppingListById]);
  

  const handleToggleItem = async (itemId: string) => {
    await toggleShoppingListItem(itemId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-red-500 mb-4">Ошибка: {error}</div>
        <button
          onClick={() => id && loadShoppingListById(id)}
          className="bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!currentShoppingList) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Список не найден</h1>
          <Link to="/shopping-list" className="text-primary-500 hover:underline">
            Вернуться к спискам
          </Link>
        </div>
      </div>
    );
  }

  // Группируем items по категориям
  const itemsByCategory: { [category: string]: ShoppingListItem[] } = {};
  currentShoppingList.items.forEach(item => {
    const category = item.category_name || 'Без категории';
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push(item);
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/shopping-list"
          className="text-primary-500 hover:underline mb-2 inline-block"
        >
          &larr; Назад к спискам
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{currentShoppingList.name}</h1>
        <p className="text-gray-600 mt-2">
          Период: {new Date(currentShoppingList.period_start).toLocaleDateString()} - {new Date(currentShoppingList.period_end).toLocaleDateString()}
        </p>
        <div className="flex items-center justify-between mt-4">
          <div>
            <span className="text-sm text-gray-500">
              {currentShoppingList.items_checked} / {currentShoppingList.total_items} куплено
            </span>
            <span className="ml-4 text-sm font-medium text-primary-600">
              {Math.round(currentShoppingList.progress)}%
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Статус: {getStatusDisplay(currentShoppingList.status)}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-primary-500 h-2 rounded-full"
            style={{ width: `${currentShoppingList.progress}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <div key={category} className="border-b last:border-b-0">
            <h2 className="bg-gray-50 px-6 py-3 text-lg font-semibold text-gray-900">
              {category}
            </h2>
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li key={item.id} className="px-6 py-4 flex items-center">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleItem(item.id)}
                    className="h-5 w-5 text-primary-500 rounded focus:ring-primary-400"
                  />
                  <div className="ml-4 flex-1">
                    <span className={`text-gray-900 ${item.checked ? 'line-through text-gray-500' : ''}`}>
                      {item.custom_name || item.ingredient_name}
                    </span>
                    <div className="text-sm text-gray-500">
                      {item.quantity} {item.unit_display}
                    </div>
                    {item.notes && (
                      <div className="text-sm text-gray-400 mt-1">
                        {item.notes}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

// Вспомогательная функция для отображения статуса
function getStatusDisplay(status: string) {
  const statusMap: { [key: string]: string } = {
    draft: 'Черновик',
    active: 'Активный',
    completed: 'Завершен',
    archived: 'Архив',
  };
  return statusMap[status] || status;
}

export default ShoppingListDetailPage;