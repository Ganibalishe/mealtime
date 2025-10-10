import React from 'react';
import Portal from './Portal';

interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
}

const WarningModal: React.FC<WarningModalProps> = ({
  isOpen,
  onClose,
  title = 'Внимание',
  message = 'Не выбраны дни для формирования списка. Пожалуйста, вернитесь на календарь и выберите дни.',
  buttonText = 'Назад'
}) => {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <div className="bg-yellow-500 px-6 py-4 border-b border-yellow-600 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="text-white hover:text-yellow-200 text-2xl">&times;</button>
          </div>

          <div className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 text-yellow-500 text-xl mr-3">⚠</div>
              <p className="text-gray-700">{message}</p>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
            <button
              onClick={onClose}
              className="btn-primary bg-yellow-500 hover:bg-yellow-600 border-yellow-500 hover:border-yellow-600"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default WarningModal;