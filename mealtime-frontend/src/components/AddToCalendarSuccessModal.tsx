// src/components/AddToCalendarSuccessModal.tsx
import React from 'react';
import Portal from './Portal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AddToCalendarSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onGoToCalendar: () => void;
  recipeName: string;
  selectedDate: string;
  selectedMealType: string;
  portions: number;
}

const AddToCalendarSuccessModal: React.FC<AddToCalendarSuccessModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  onGoToCalendar,
  recipeName,
  selectedDate,
  selectedMealType,
  portions,
}) => {
  if (!isOpen) return null;

  // Функция для получения метки типа приема пищи
  const getMealTypeLabel = (type: string): string => {
    const mealTypes: { [key: string]: string } = {
      breakfast: '☀️ Завтрак',
      lunch: '🍽️ Обед',
      dinner: '🌙 Ужин',
      snack: '🥨 Перекус',
      supper: '🍎 Поздний ужин',
    };
    return mealTypes[type] || type;
  };

  // Форматирование даты
  const formattedDate = format(new Date(selectedDate), 'd MMMM yyyy', { locale: ru });

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          {/* Заголовок с primary цветом */}
          <div className="bg-primary-500 px-6 py-4 border-b border-primary-600 flex justify-between items-center rounded-t-lg">
            <h3 className="text-lg font-semibold text-white">✅ Рецепт добавлен в календарь</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-primary-200 text-2xl transition-colors"
            >
              &times;
            </button>
          </div>

          {/* Содержимое */}
          <div className="p-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl text-primary-600">📅</span>
              </div>
              <h4 className="text-xl font-bold text-neutral-900 mb-2">{recipeName}</h4>
              <p className="text-neutral-600">
                успешно добавлен в ваш план питания
              </p>
            </div>

            <div className="bg-neutral-50 rounded-lg p-4 mb-4 border border-neutral-200">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">📅 Дата:</span>
                  <span className="font-medium text-neutral-900">{formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">🍽️ Прием пищи:</span>
                  <span className="font-medium text-neutral-900">{getMealTypeLabel(selectedMealType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">👥 Порции:</span>
                  <span className="font-medium text-neutral-900">{portions}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 rounded-b-lg">
            <button
              onClick={onContinue}
              className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors order-2 sm:order-1"
            >
              Продолжить просмотр
            </button>
            <button
              onClick={onGoToCalendar}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors order-1 sm:order-2"
            >
              Перейти в календарь
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default AddToCalendarSuccessModal;