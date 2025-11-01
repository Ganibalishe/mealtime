import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Layout from './components/Layout';
import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; // Добавляем импорт
import RecipeDetailPage from './pages/RecipeDetailPage';
import ShoppingListPage from './pages/ShoppingListPage';
import ShoppingListDetailPage from './pages/ShoppingListDetailPage';
import RecipesPage from './pages/RecipesPage';
import { useAuth } from './hooks/useAuth';
import PremiumMenusPage from './pages/PremiumMenusPage';
import PremiumMenuDetailPage from './pages/PremiumMenuDetailPage';

// Компонент для проверки авторизации с загрузкой
const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuth();

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return <Layout>{children}</Layout>;
};

// Компонент для публичных страниц (доступны без авторизации)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Routes>
          {/* Публичные страницы - доступны без авторизации */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} /> {/* Добавляем регистрацию */}

          {/* Страницы с Layout но без требований авторизации */}
          <Route path="/" element={<PublicRoute><CalendarPage /></PublicRoute>} />
          <Route path="/recipes" element={<PublicRoute><RecipesPage /></PublicRoute>} />
          <Route path="/recipes/:id" element={<PublicRoute><RecipeDetailPage /></PublicRoute>} />
          <Route path="/premium-menus" element={<Layout><PremiumMenusPage /></Layout>} />
          <Route path="/premium-menus/:id" element={<Layout><PremiumMenuDetailPage /></Layout>} />
          {/* Защищенные страницы - только для авторизованных */}
          <Route path="/shopping-list" element={
            <AuthWrapper>
              <ShoppingListPage />
            </AuthWrapper>
          } />
          <Route path="/shopping-list/:id" element={
            <AuthWrapper>
              <ShoppingListDetailPage />
            </AuthWrapper>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;