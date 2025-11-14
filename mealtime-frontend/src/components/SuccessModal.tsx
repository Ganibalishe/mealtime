import React, { useEffect } from 'react';
import Portal from './Portal';
import { modalManager } from '../utils/modalManager';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onGoToList: () => void;
  title?: string;
  message?: string;
  continueText?: string;
  goToListText?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  onGoToList,
  title = 'Список покупок создан',
  message = 'Список покупок успешно создан!',
  continueText = 'Продолжить',
  goToListText = 'Перейти в список'
}) => {
  // Регистрация модального окна для обработки кнопки "Назад"
  useEffect(() => {
    if (isOpen) {
      const modalId = modalManager.register(onClose);
      return () => {
        modalManager.unregister(modalId);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <div className="bg-primary-500 px-6 py-4 border-b border-primary-600 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="text-white hover:text-primary-200 text-2xl">&times;</button>
          </div>

          <div className="p-6">
            <p className="text-gray-700">{message}</p>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3">
            <button
              onClick={onContinue}
              className="btn-secondary"
            >
              {continueText}
            </button>
            <button
              onClick={onGoToList}
              className="btn-primary"
            >
              {goToListText}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default SuccessModal;