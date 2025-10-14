// hooks/useAuth.ts - ОРИГИНАЛЬНАЯ ВЕРСИЯ
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      setIsAuthenticated(!!token);
    };

    checkAuth();

    // Слушаем изменения в localStorage (на случай выхода из другого окна)
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return isAuthenticated;
};