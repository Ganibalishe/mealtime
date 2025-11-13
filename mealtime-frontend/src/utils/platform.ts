// utils/platform.ts - Утилита для определения платформы
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const isWeb = !isNative;
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';

// Безопасная проверка наличия window
export const hasWindow = typeof window !== 'undefined';
export const hasDocument = typeof document !== 'undefined';

