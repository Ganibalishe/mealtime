import React, { useState, useEffect } from 'react';
import { modalManager } from '../utils/modalManager';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (startDate: string, portions: number) => void; // Обновлен интерфейс
  isLoading?: boolean;
  menuName: string;
  durationDays: number;
  defaultPortions?: number; // Добавляем пропс для начального количества порций
}

const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  menuName,
  durationDays,
  defaultPortions = 2 // Значение по умолчанию
}) => {
  const [startDate, setStartDate] = useState('');
  const [portions, setPortions] = useState<number>(defaultPortions);
  const [errors, setErrors] = useState<string[]>([]);

  // Устанавливаем минимальную дату (сегодня)
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!startDate) {
      newErrors.push('Пожалуйста, выберите дату начала');
    } else if (new Date(startDate) < new Date(today)) {
      newErrors.push('Дата не может быть в прошлом');
    }

    if (!portions || portions < 1) {
      newErrors.push('Количество порций должно быть не менее 1');
    } else if (portions > 20) {
      newErrors.push('Количество порций не может превышать 20');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    onSubmit(startDate, portions); // Теперь передаем оба параметра
  };

  const handleClose = () => {
    setStartDate('');
    setPortions(defaultPortions);
    setErrors([]);
    onClose();
  };

  // Регистрация модального окна для обработки кнопки "Назад"
  useEffect(() => {
    if (isOpen) {
      const modalId = modalManager.register(() => {
        handleClose();
      });
      return () => {
        modalManager.unregister(modalId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // Вычисляем дату окончания
  const getEndDate = () => {
    if (!startDate) return '';
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays - 1);
    return endDate.toISOString().split('T')[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Создание плана питания</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Контент */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{menuName}</h3>
            <p className="text-gray-600 text-sm">
              План питания будет создан на {durationDays} дней
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Выбор даты */}
            <div className="mb-4">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Дата начала меню *
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={today}
                className="input-field w-full"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Выберите дату, с которой хотите начать это меню
              </p>
            </div>

            {/* Количество порций */}
            <div className="mb-6">
              <label htmlFor="portions" className="block text-sm font-medium text-gray-700 mb-2">
                Количество порций на каждый прием пищи *
              </label>
              <input
                type="number"
                id="portions"
                value={portions}
                onChange={(e) => setPortions(parseInt(e.target.value) || 1)}
                min="1"
                max="20"
                className="input-field w-full"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Укажите количество порций для каждого рецепта в меню (от 1 до 20)
              </p>
            </div>

            {/* Информация о периоде */}
            {startDate && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-primary-800 mb-2">Период питания:</h4>
                <div className="text-sm text-primary-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Начало:</span>
                    <span className="font-medium">{formatDate(startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Окончание:</span>
                    <span className="font-medium">{formatDate(getEndDate())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Порций на прием:</span>
                    <span className="font-medium">{portions}</span>
                  </div>
                  <div className="flex justify-between border-t border-primary-200 pt-1 mt-1">
                    <span>Всего дней:</span>
                    <span className="font-medium">{durationDays}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Ошибки */}
            {errors.length > 0 && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <ul className="text-red-700 text-sm space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Предупреждение о перезаписи */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-yellow-800 text-sm">
                  <strong>Внимание:</strong> Если в выбранный период уже есть планы питания,
                  они будут дополнены рецептами из этого меню.
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Футер с кнопками */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !startDate || !portions}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Создание...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Создать план</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePlanModal;