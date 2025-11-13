import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mealtime.planner',
  appName: 'Mealtime Planner',
  webDir: 'dist',
  server: {
    // Для продакшна используем https
    androidScheme: 'https'
  },
  plugins: {
    Browser: {
      // Настройки для In-App Browser
    }
  }
};

export default config;
