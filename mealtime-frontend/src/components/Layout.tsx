// components/Layout.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { authService } from '../services/api';
import { useAuth } from '../hooks/useAuth'; // Добавляем хук авторизации

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAuthenticated = useAuth(); // Проверяем авторизацию

  const navigation = [
    { name: 'Календарь', href: '/', icon: '📅', mobileIcon: '📅' },
    { name: 'Рецепты', href: '/recipes', icon: '🍳', mobileIcon: '🍳' },
    ...(isAuthenticated ? [
      { name: 'Список покупок', href: '/shopping-list', icon: '🛒', mobileIcon: '🛒' }
    ] : [])
  ];

  const handleLogout = () => {
    authService.logout();
    navigate('/');
    window.location.reload(); // Обновляем страницу для сброса состояния
  };

  return (
    <div className="min-h-screen bg-page">
      {/* Навигация */}
      <nav className="bg-primary-500 shadow-sm border-b border-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Логотип и бренд */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-accent-500 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                  🍽️
                </div>
                <h1 className="text-xl font-bold text-white">Mealtime Planner</h1>
              </div>
            </div>

            {/* Десктопное меню */}
            <div className="hidden md:flex md:items-center md:space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    location.pathname === item.href
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-primary-100 hover:text-white hover:bg-primary-600'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}

              {/* Кнопки для неавторизованных пользователей */}
              {!isAuthenticated ? (
                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    to="/login"
                    className="text-primary-100 hover:text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-primary-600 transition-colors"
                  >
                    Войти
                  </Link>
                  <Link
                    to="/register"
                    className="bg-white text-primary-600 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Регистрация
                  </Link>
                </div>
              ) : (
                // Кнопка выхода для авторизованных
                <button
                  onClick={handleLogout}
                  className="ml-4 text-primary-100 hover:text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-primary-600 transition-colors"
                >
                  Выйти
                </button>
              )}
            </div>

            {/* Кнопка мобильного меню */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-primary-100 hover:text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-white"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Мобильное меню */}
          {isMobileMenuOpen && (
            <div className="md:hidden bg-primary-600 border-t border-primary-500">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors ${
                      location.pathname === item.href
                        ? 'bg-primary-700 text-white'
                        : 'text-primary-100 hover:text-white hover:bg-primary-700'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.mobileIcon}</span>
                    {item.name}
                  </Link>
                ))}

                {/* Мобильные кнопки авторизации */}
                {!isAuthenticated ? (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center px-3 py-2 text-base font-medium rounded-md text-primary-100 hover:text-white hover:bg-primary-700 transition-colors"
                    >
                      <span className="mr-3 text-lg">🔑</span>
                      Войти
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center px-3 py-2 text-base font-medium rounded-md text-primary-100 hover:text-white hover:bg-primary-700 transition-colors"
                    >
                      <span className="mr-3 text-lg">📝</span>
                      Регистрация
                    </Link>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center px-3 py-2 text-base font-medium rounded-md text-primary-100 hover:text-white hover:bg-primary-700 w-full text-left transition-colors"
                  >
                    <span className="mr-3 text-lg">🚪</span>
                    Выйти
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Основной контент */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 sm:p-6 fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;