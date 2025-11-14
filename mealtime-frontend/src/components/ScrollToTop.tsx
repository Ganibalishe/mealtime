// components/ScrollToTop.tsx - Прокрутка страницы вверх при смене маршрута
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Прокручиваем страницу вверх при изменении маршрута
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth' // Плавная прокрутка
    });

    // Также прокручиваем основной контейнер, если он есть
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }

    // Для мобильных устройств также прокручиваем body
    document.body.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;

