import React, { useState, useEffect } from 'react';

const InstructionBlock: React.FC = () => {
  // Инициализируем состояние как false, затем обновим после чтения localStorage
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Загружаем состояние из localStorage при монтировании
  useEffect(() => {
    const savedState = localStorage.getItem('instructionExpanded');
    if (savedState !== null) {
      setIsExpanded(JSON.parse(savedState));
    } else {
      // Если в localStorage нет значения, показываем блок развернутым по умолчанию
      setIsExpanded(true);
    }
    setIsInitialized(true);
  }, []);

  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('instructionExpanded', JSON.stringify(isExpanded));
    }
  }, [isExpanded, isInitialized]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Не рендерим до инициализации, чтобы избежать мерцания
  if (!isInitialized) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200 rounded-lg shadow-sm mb-6 overflow-hidden">
      {/* Заголовок блока */}
      <div
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-white hover:bg-opacity-50 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="flex items-center space-x-3">
          <div className="bg-primary-500 rounded-full p-2">
            <span className="text-white text-lg">📋</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Добро пожаловать в планировщик питания!</h3>
            <p className="text-sm text-gray-600">Узнайте, как эффективно использовать приложение</p>
          </div>
        </div>
        <button className="text-gray-500 hover:text-gray-700 transition-colors">
          <svg
            className={`w-5 h-5 transform transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Содержимое инструкции */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Левая колонка - основные шаги */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
                🎯 Основные шаги:
              </h4>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Выберите дни</p>
                    <p className="text-sm text-gray-600">
                      Нажмите на дни в календаре или используйте чекбоксы на мобильном, чтобы выбрать дни для планирования
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Добавьте рецепты</p>
                    <p className="text-sm text-gray-600">
                      Для каждого приема пищи нажмите "+ Добавить рецепт" и выберите из библиотеки
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Сформируйте список</p>
                    <p className="text-sm text-gray-600">
                      Нажмите "Сформировать список покупок" - приложение автоматически объединит все ингредиенты
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Правая колонка - дополнительные возможности */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
                💡 Полезные функции:
              </h4>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-primary-500 text-lg">🔍</div>
                  <div>
                    <p className="font-medium text-gray-900">Умный поиск</p>
                    <p className="text-sm text-gray-600">
                      Ищите рецепты по названию, времени приготовления или тегам
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-primary-500 text-lg">🏷️</div>
                  <div>
                    <p className="font-medium text-gray-900">Фильтрация по тегам</p>
                    <p className="text-sm text-gray-600">
                      Используйте цветные теги для быстрого поиска подходящих рецептов
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-primary-500 text-lg">📱</div>
                  <div>
                    <p className="font-medium text-gray-900">Адаптивный дизайн</p>
                    <p className="text-sm text-gray-600">
                      Работает одинаково удобно на компьютере и мобильных устройствах
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-primary-500 text-lg">🛒</div>
                  <div>
                    <p className="font-medium text-gray-900">Автоматизация покупок</p>
                    <p className="text-sm text-gray-600">
                      Система автоматически объединяет одинаковые ингредиенты из разных рецептов
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Быстрый старт для мобильных */}
          <div className="lg:hidden mt-4 bg-white rounded-lg p-4 border border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-2">🚀 Быстрый старт:</h5>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• <strong>Нажмите на день</strong> в календаре, чтобы выбрать его для списка покупок</p>
              <p>• <strong>Разверните день</strong>, нажав на стрелку, чтобы увидеть приемы пищи</p>
              <p>• <strong>Добавляйте рецепты</strong> для каждого приема пищи</p>
              <p>• <strong>Формируйте список</strong> покупок для выбранных дней</p>
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <p className="text-sm text-gray-600">
                💡 <strong>Совет:</strong> Начните с планирования 2-3 дней, чтобы освоиться с приложением
              </p>
              <button
                onClick={toggleExpanded}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
              >
                Скрыть подсказку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructionBlock;