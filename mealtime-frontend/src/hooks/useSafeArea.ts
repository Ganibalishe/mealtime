// hooks/useSafeArea.ts - Определение safe area для Android/iOS
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const useSafeArea = () => {
  const [bottomInset, setBottomInset] = useState(56); // Начальное значение для Android

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // Для веба используем CSS переменные
      const cssInset = getComputedStyle(document.documentElement)
        .getPropertyValue('env(safe-area-inset-bottom)');
      const insetValue = parseInt(cssInset) || 0;
      setBottomInset(insetValue);
      return;
    }

    // Для мобильных платформ определяем высоту navigation bar
    const calculateBottomInset = () => {
      // Метод 1: Используем visualViewport API (самый точный)
      const visualViewport = (window as any).visualViewport;
      if (visualViewport) {
        const viewportHeight = window.innerHeight;
        const visualHeight = visualViewport.height;
        const difference = viewportHeight - visualHeight;

        if (difference > 0 && difference < 200) { // Разумные пределы
          // Это высота navigation bar
          setBottomInset(Math.max(difference, 48));
          // Устанавливаем CSS переменную для использования в стилях
          document.documentElement.style.setProperty('--safe-area-bottom-calculated', `${Math.max(difference, 48)}px`);
          return;
        }
      }

      // Метод 2: Используем разницу между window.innerHeight и screen.height
      // Это работает когда navigation bar видимый
      const screenHeight = (window.screen as any).availHeight || window.screen.height;
      const windowHeight = window.innerHeight;
      const heightDiff = screenHeight - windowHeight;

      if (heightDiff > 0 && heightDiff < 200) { // Разумные пределы
        const calculated = Math.max(heightDiff, 48);
        setBottomInset(calculated);
        document.documentElement.style.setProperty('--safe-area-bottom-calculated', `${calculated}px`);
        return;
      }

      // Метод 3: Используем CSS переменную env()
      const cssInset = getComputedStyle(document.documentElement)
        .getPropertyValue('env(safe-area-inset-bottom)');
      const cssValue = parseInt(cssInset) || 0;

      if (cssValue > 0) {
        const calculated = Math.max(cssValue, 48);
        setBottomInset(calculated);
        document.documentElement.style.setProperty('--safe-area-bottom-calculated', `${calculated}px`);
        return;
      }

      // Fallback: стандартная высота для Android
      // Большинство Android устройств имеют navigation bar 48-56px
      // Используем 64px для надежности (с учетом возможных вариаций)
      const fallback = 64;
      setBottomInset(fallback);
      document.documentElement.style.setProperty('--safe-area-bottom-calculated', `${fallback}px`);
    };

    // Вычисляем при загрузке с небольшой задержкой (после рендера)
    const timeout1 = setTimeout(calculateBottomInset, 100);
    const timeout2 = setTimeout(calculateBottomInset, 500); // Повторная проверка

    // Пересчитываем при изменении размера окна
    window.addEventListener('resize', calculateBottomInset);
    window.addEventListener('orientationchange', () => {
      setTimeout(calculateBottomInset, 200); // Задержка после поворота
    });

    // Также слушаем изменения visualViewport
    const visualViewport = (window as any).visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', calculateBottomInset);
      visualViewport.addEventListener('scroll', calculateBottomInset);
    }

    return () => {
      window.removeEventListener('resize', calculateBottomInset);
      window.removeEventListener('orientationchange', calculateBottomInset);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', calculateBottomInset);
        visualViewport.removeEventListener('scroll', calculateBottomInset);
      }
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, []);

  return bottomInset;
};

