import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Удалить',
  cancelText = 'Отмена',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      header: 'bg-accent-500',
      button: 'btn-accent',
      icon: '🗑️'
    },
    warning: {
      header: 'bg-secondary-500',
      button: 'btn-secondary',
      icon: '⚠️'
    },
    info: {
      header: 'bg-primary-500',
      button: 'btn-primary',
      icon: 'ℹ️'
    }
  };

  const styles = typeStyles[type];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-scale-in">
        {/* Заголовок */}
        <div className={`${styles.header} px-6 py-4 rounded-t-lg`}>
          <div className="flex items-center">
            <span className="text-xl mr-3">{styles.icon}</span>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
        </div>

        {/* Сообщение */}
        <div className="p-6">
          <p className="text-neutral-700 leading-relaxed">{message}</p>
        </div>

        {/* Кнопки */}
        <div className="bg-neutral-50 px-4 sm:px-6 py-4 rounded-b-lg flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <button
                onClick={onClose}
                className="btn-outline order-2 sm:order-1 py-3 sm:py-2 mobile-touch-target text-sm sm:text-base"
            >
                {cancelText}
            </button>
            <button
                onClick={() => {
                onConfirm();
                onClose();
                }}
                className={`${styles.button} order-1 sm:order-2 py-3 sm:py-2 mobile-touch-target text-sm sm:text-base`}
            >
                {confirmText}
            </button>
            </div>
      </div>
    </div>
  );
};

export default ConfirmModal;