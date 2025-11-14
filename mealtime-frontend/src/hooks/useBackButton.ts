// hooks/useBackButton.ts - Обработка системной кнопки "Назад" в Android
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { modalManager } from '../utils/modalManager';

export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Только для мобильных платформ
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Обработчик hardware back button
    const backButtonHandler = App.addListener('backButton', () => {
      // Сначала проверяем, есть ли открытые модальные окна
      if (modalManager.hasOpenModals()) {
        // Закрываем последнее открытое модальное окно
        modalManager.closeTopModal();
        return;
      }

      // Главные страницы, с которых можно закрыть приложение
      const exitPages = ['/', '/login', '/register'];
      const isOnExitPage = exitPages.includes(location.pathname);

      // Если на главной странице - закрываем приложение
      if (isOnExitPage) {
        App.exitApp();
        return;
      }

      // На всех остальных страницах - возвращаемся назад через react-router
      navigate(-1);
    });

    // Очистка при размонтировании
    return () => {
      backButtonHandler.remove();
    };
  }, [navigate, location.pathname]);
};

