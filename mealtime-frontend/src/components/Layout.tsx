// components/Layout.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ С ИНФОРМАЦИЕЙ ДЛЯ ЭКВАЙРИНГА
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { authService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { useSafeArea } from '../hooks/useSafeArea';
import BottomMenuBar from './BottomMenuBar';
import BottomSheetMenu from './BottomSheetMenu';

interface LayoutProps {
  children: React.ReactNode;
  variant?: 'default' | 'auth';
}

const Layout: React.FC<LayoutProps> = ({ children, variant = 'default' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const isAuthenticated = useAuth();
  const bottomInset = useSafeArea();

  const navigation = [
    { name: 'Календарь', href: '/', icon: '📅', mobileIcon: '📅' },
    { name: 'Рецепты', href: '/recipes', icon: '🍳', mobileIcon: '🍳' },
    { name: 'Готовые меню', href: '/premium-menus', icon: '⭐', mobileIcon: '⭐' },
    ...(isAuthenticated ? [
      { name: 'Список покупок', href: '/shopping-list', icon: '🛒', mobileIcon: '🛒' }
    ] : [])
  ];

  const handleLogout = () => {
    authService.logout();
    navigate('/');
    window.location.reload();
  };

  // Высота bottom menu bar (только для мобильных) - определяем здесь для использования в футерах
  // Уменьшили высоту плашки: 48px (кнопка) + bottomInset (системные кнопки)
  const bottomMenuHeight = Capacitor.isNativePlatform() ? 48 + bottomInset : 0;

  // Футер для auth страниц (более простой)
  const AuthFooter = () => (
    <footer className="bg-white border-t border-gray-200 mt-auto" style={{
      marginBottom: Capacitor.isNativePlatform() ? `${bottomMenuHeight}px` : '0px'
    }}>
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Mealtime Planner. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );

  // Основной футер - ОБНОВЛЕН С ИНФОРМАЦИЕЙ ДЛЯ ЭКВАЙРИНГА
  const MainFooter = () => (
    <footer className="bg-white border-t border-gray-200 mt-auto" style={{
      marginBottom: Capacitor.isNativePlatform() ? `${bottomMenuHeight}px` : '0px'
    }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* О компании */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mealtime Planner</h3>
            <p className="text-gray-600 text-sm mb-4">
              Умный планировщик питания для всей семьи. Создавайте меню на неделю
              и автоматически получайте списки покупок.
            </p>
            <div className="text-sm text-gray-500">
              <p>Смирнов Илья Алексеевич</p>
              <p>ИНН: 772075772259</p>
            </div>
          </div>

          {/* Навигация */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Навигация</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-gray-600 hover:text-gray-900">
                  Главная
                </Link>
              </li>
              <li>
                <Link to="/recipes" className="text-gray-600 hover:text-gray-900">
                  Все рецепты
                </Link>
              </li>
              <li>
                <Link to="/premium-menus" className="text-gray-600 hover:text-gray-900">
                  Готовые меню
                </Link>
              </li>
              {!isAuthenticated && (
                <>
                  <li>
                    <Link to="/login" className="text-gray-600 hover:text-gray-900">
                      Вход
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="text-gray-600 hover:text-gray-900">
                      Регистрация
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Возможности */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Возможности</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>📅 Планирование питания</li>
              <li>🛒 Списки покупок</li>
              <li>🍳 Библиотека рецептов</li>
              <li>⭐ Готовые меню</li>
              <li>👨‍👩‍👧‍👦 Для всей семьи</li>
            </ul>
          </div>

          {/* Эквайринг и контакты */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Эквайринг и поддержка</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-900">Контактные данные:</p>
                <p className="text-gray-600">+7 (903) 281-50-16</p>
              </div>

              <div>
                <p className="font-medium text-gray-900">Реквизиты самозанятого:</p>
                <p className="text-gray-600">Смирнов Илья Алексеевич</p>
                <p className="text-gray-600">ИНН: 772075772259</p>
              </div>

              <div>
                <button
                  onClick={() => setShowTerms(!showTerms)}
                  className="text-primary-600 hover:text-primary-700 font-medium text-left"
                >
                  Условия предоставления услуг и отказа от покупки
                </button>

                {showTerms && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-600 space-y-2 max-h-40 overflow-y-auto">
                      <h4 className="font-semibold text-sm mb-2">Условия предоставления услуг</h4>

                      <p><strong>1. Общие положения</strong></p>
                      <p>1.1. Настоящие условия регулируют порядок предоставления услуг по доступу к готовым меню питания через сервис Mealtime Planner.</p>

                      <p><strong>2. Порядок оплаты и доступа</strong></p>
                      <p>2.1. Оплата услуг производится через систему эквайринга.</p>
                      <p>2.2. После успешной оплаты доступ к премиум меню предоставляется мгновенно.</p>
                      <p>2.3. Все платежи обрабатываются защищенными платежными системами.</p>

                      <p><strong>3. Отказ от покупки</strong></p>
                      <p>3.1. В соответствии с законодательством РФ, отказ от цифрового товара возможен до момента его получения.</p>
                      <p>3.2. После активации премиум меню и получения доступа к материалам возврат средств не производится.</p>
                      <p>3.3. В случае технических ошибок при оплате, обратитесь в службу поддержки.</p>

                      <p><strong>4. Контактная информация</strong></p>
                      <p>4.1. По всем вопросам обращайтесь: +7 (903) 281-50-16</p>
                      <p>4.2. Email: support@mealtime-planner.ru</p>

                      <p className="text-xs mt-3">Дата последнего обновления: {new Date().toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Нижняя часть футера */}
        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Mealtime Planner. Все права защищены.
            </p>
            <div className="mt-2 md:mt-0 text-xs text-gray-500">
              <p>Сервис планирования питания</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );

  return (
    <div
      className="min-h-screen flex flex-col bg-page"
      style={{
        paddingBottom: Capacitor.isNativePlatform() ? `${bottomMenuHeight}px` : '0px',
        minHeight: Capacitor.isNativePlatform()
          ? `calc(100vh - ${bottomMenuHeight}px)`
          : '100vh'
      }}
    >
      {/* Навигация с оригинальными цветами */}
      <nav className="bg-primary-500 shadow-sm border-b border-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Логотип и бренд */}
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-accent-500 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                  🍽️
                </div>
                <h1 className="text-xl font-bold text-white">Mealtime Planner</h1>
              </Link>
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

            {/* Кнопка мобильного меню (скрыта на нативных платформах, т.к. есть bottom menu) */}
            {!Capacitor.isNativePlatform() && (
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
            )}
          </div>

          {/* Мобильное меню (скрыто на нативных платформах) */}
          {isMobileMenuOpen && !Capacitor.isNativePlatform() && (
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
      <main className={`flex-1 safe-content ${variant === 'default' ? 'py-6' : 'flex items-center justify-center py-12'}`}>
        {variant === 'default' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 sm:p-6 fade-in">
              {children}
            </div>
          </div>
        ) : (
          // Для auth страниц - центрирование по горизонтали и вертикали
          <div className="w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        )}
      </main>

      {/* Футер */}
      {variant === 'auth' ? <AuthFooter /> : <MainFooter />}

      {/* Закрепленная плашка меню внизу (только для мобильных) */}
      {Capacitor.isNativePlatform() && (
        <>
          <BottomMenuBar onMenuClick={() => setIsBottomSheetOpen(true)} />
          <BottomSheetMenu
            isOpen={isBottomSheetOpen}
            onClose={() => setIsBottomSheetOpen(false)}
            navigation={navigation}
            isAuthenticated={isAuthenticated}
            onLogout={handleLogout}
          />
        </>
      )}
    </div>
  );
};

export default Layout;