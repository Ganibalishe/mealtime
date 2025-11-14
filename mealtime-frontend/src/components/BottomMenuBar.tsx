// components/BottomMenuBar.tsx - Закрепленная плашка меню внизу экрана
import React from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Capacitor } from '@capacitor/core';
import { useSafeArea } from '../hooks/useSafeArea';

interface BottomMenuBarProps {
  onMenuClick: () => void;
}

const BottomMenuBar: React.FC<BottomMenuBarProps> = ({ onMenuClick }) => {
  const bottomInset = useSafeArea();

  // Показываем только на мобильных устройствах
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-primary-500 shadow-lg border-t border-primary-600"
      style={{
        paddingBottom: `${bottomInset}px`,
        marginBottom: 0,
        // Убеждаемся, что плашка поверх navigation bar
        position: 'fixed',
        bottom: 0
      }}
    >
      <button
        onClick={onMenuClick}
        className="w-full flex items-center justify-center py-2.5 px-4 text-white hover:bg-primary-600 transition-colors duration-200 active:bg-primary-700"
      >
        <Bars3Icon className="h-5 w-5 mr-2" />
        <span className="text-sm font-medium">Меню</span>
      </button>
    </div>
  );
};

export default BottomMenuBar;

