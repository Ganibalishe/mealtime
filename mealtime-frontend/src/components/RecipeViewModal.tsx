// components/RecipeViewModal.tsx - ОБНОВЛЕННЫЙ ДИЗАЙН
import React from 'react';
import { XMarkIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import type { Recipe } from '../types';

interface RecipeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  isLoading?: boolean;
}

const RecipeViewModal: React.FC<RecipeViewModalProps> = ({
  isOpen,
  onClose,
  recipe,
  isLoading = false
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800'
  };

  const handleViewDetails = () => {
    onClose();
    if (recipe) {
      navigate(`/recipes/${recipe.id}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
          {/* Header */}
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold leading-6 text-gray-900">
                {isLoading ? 'Загрузка...' : recipe?.name}
              </h3>
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={onClose}
                disabled={isLoading}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              </div>
            ) : recipe ? (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Левая колонка - основная информация */}
                <div className="space-y-6">
                  {/* Изображение рецепта */}
                  {recipe.image && (
                    <div className="rounded-lg overflow-hidden">
                      <img
                        src={recipe.image}
                        alt={recipe.name}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  )}

                  {/* Описание */}
                  {recipe.description && (
                    <div>
                      <p className="text-gray-700 text-base leading-relaxed">{recipe.description}</p>
                    </div>
                  )}

                  {/* Теги */}
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 text-base">Теги:</h4>
                      <div className="flex flex-wrap gap-2">
                        {recipe.tags.map(tag => (
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
                </div>

                {/* Правая колонка - детали и действия */}
                <div className="space-y-6">
                  {/* Карточки с информацией */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <div className="text-sm text-neutral-500 mb-1">Время приготовления</div>
                      <div className="font-semibold text-base flex items-center">
                        <ClockIcon className="h-4 w-4 mr-2 text-neutral-600" />
                        {recipe.cooking_time} мин
                      </div>
                    </div>

                    <div className="bg-neutral-50 rounded-lg p-4">
                      <div className="text-sm text-neutral-500 mb-1">Порции</div>
                      <div className="font-semibold text-base flex items-center">
                        <UserGroupIcon className="h-4 w-4 mr-2 text-neutral-600" />
                        {recipe.portions} порции
                      </div>
                    </div>

                    <div className="bg-neutral-50 rounded-lg p-4">
                      <div className="text-sm text-neutral-500 mb-1">Сложность</div>
                      <div className="font-semibold text-base">
                        <span className={`px-2 py-1 rounded-full text-xs ${difficultyColors[recipe.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                          {recipe.difficulty_display}
                        </span>
                      </div>
                    </div>

                    {recipe.cooking_method_name && (
                      <div className="bg-neutral-50 rounded-lg p-4">
                        <div className="text-sm text-neutral-500 mb-1">Способ приготовления</div>
                        <div className="font-semibold text-base">🍳 {recipe.cooking_method_name}</div>
                      </div>
                    )}
                  </div>

                  {/* Ингредиенты */}
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 text-base">Ингредиенты:</h4>
                      <div className="bg-neutral-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <div className="space-y-3">
                          {recipe.ingredients.map((ingredient) => (
                            <div
                              key={ingredient.id}
                              className="flex justify-between items-center text-sm pb-2 border-b border-neutral-200 last:border-b-0 last:pb-0"
                            >
                              <span className="text-gray-700 flex-1 pr-4">{ingredient.ingredient_name}</span>
                              <span className="text-gray-900 font-medium whitespace-nowrap">
                                {ingredient.quantity} {ingredient.unit_display}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Кнопки действий */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 bg-white border border-neutral-300 text-neutral-700 px-4 py-3 rounded-lg font-medium hover:bg-neutral-50 transition-colors text-base"
                    >
                      Назад
                    </button>
                    <button
                      type="button"
                      onClick={handleViewDetails}
                      className="flex-1 bg-secondary-400 hover:bg-secondary-500 text-neutral-900 font-medium py-3 px-4 rounded-lg transition-colors duration-200 text-base"
                    >
                      📖 Подробнее
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Рецепт не найден
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeViewModal;