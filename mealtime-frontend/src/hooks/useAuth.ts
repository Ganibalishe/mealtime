// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      setIsAuthenticated(!!token);
    };

    checkAuth();

    // Безопасно: слушаем изменения в localStorage только для веба
    // В мобильных приложениях storage события не работают так же
    if (!Capacitor.isNativePlatform() && typeof window !== 'undefined') {
      const handleStorageChange = () => {
        checkAuth();
      };

      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  return isAuthenticated;
};