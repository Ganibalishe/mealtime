// components/BottomSheetMenu.tsx - Разворачивающееся меню снизу
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Capacitor } from '@capacitor/core';
import { useSafeArea } from '../hooks/useSafeArea';
import { modalManager } from '../utils/modalManager';

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  mobileIcon: string;
}

interface BottomSheetMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavigationItem[];
  isAuthenticated: boolean;
  onLogout: () => void;
}

const BottomSheetMenu: React.FC<BottomSheetMenuProps> = ({
  isOpen,
  onClose,
  navigation,
  isAuthenticated,
  onLogout
}) => {
  const location = useLocation();
  const bottomInset = useSafeArea();
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Показываем только на мобильных устройствах
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  // Закрытие при клике на overlay
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Обработка свайпа вниз для закрытия
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentTouchY = e.touches[0].clientY;
    const deltaY = currentTouchY - startY;

    // Разрешаем свайп только вниз
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 100) {
      // Если свайпнули больше 100px вниз - закрываем
      onClose();
    }
    setCurrentY(0);
    setIsDragging(false);
  };

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!isOpen) {
      setCurrentY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Регистрация модального окна для обработки кнопки "Назад"
  useEffect(() => {
    if (isOpen) {
      const modalId = modalManager.register(onClose);
      return () => {
        modalManager.unregister(modalId);
      };
    }
  }, [isOpen, onClose]);

  // Закрытие при нажатии Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Блокируем скролл body когда меню открыто
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
        onClick={handleOverlayClick}
        style={{ marginBottom: 0 }}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[80vh] overflow-hidden flex flex-col"
        style={{
          paddingBottom: `${bottomInset}px`,
          transform: isOpen
            ? `translateY(${Math.max(0, currentY)}px)`
            : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar */}
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
          <button
            onClick={onClose}
            className="absolute right-4 top-3 p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Menu content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl mr-4">{item.mobileIcon}</span>
                  <span className="text-base">{item.name}</span>
                  {isActive && (
                    <span className="ml-auto text-primary-600">●</span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-200" />

          {/* Auth buttons */}
          {!isAuthenticated ? (
            <div className="space-y-2">
              <Link
                to="/login"
                onClick={onClose}
                className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="text-2xl mr-4">🔑</span>
                <span className="text-base">Войти</span>
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="flex items-center px-4 py-3 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium"
              >
                <span className="text-2xl mr-4">📝</span>
                <span className="text-base">Регистрация</span>
              </Link>
            </div>
          ) : (
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <span className="text-2xl mr-4">🚪</span>
              <span className="text-base">Выйти</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default BottomSheetMenu;

