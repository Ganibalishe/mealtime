// pages/LoginPage.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authService.login(formData.username, formData.password);

      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка входа. Проверьте логин и пароль.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Простое верхнее меню */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                  🍽️
                </div>
                <h1 className="text-xl font-bold text-gray-900">Mealtime Planner</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Главная
              </Link>
              <Link
                to="/recipes"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Рецепты
              </Link>
              <Link
                to="/register"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Регистрация
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Основной контент */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">🔑</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Вход в аккаунт
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Нет аккаунта?{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                Зарегистрируйтесь
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-600">{error}</div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Имя пользователя
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Введите имя пользователя"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Пароль
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Введите пароль"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Вход...' : 'Войти'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Футер */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mealtime Planner</h3>
              <p className="text-gray-600 text-sm">
                Умный планировщик питания для всей семьи. Создавайте меню на неделю
                и автоматически получайте списки покупок.
              </p>
            </div>

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
                  <Link to="/login" className="text-gray-600 hover:text-gray-900">
                    Вход
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-gray-600 hover:text-gray-900">
                    Регистрация
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Возможности</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>📅 Планирование питания</li>
                <li>🛒 Списки покупок</li>
                <li>🍳 Библиотека рецептов</li>
                <li>👨‍👩‍👧‍👦 Для всей семьи</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Mealtime Planner. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;