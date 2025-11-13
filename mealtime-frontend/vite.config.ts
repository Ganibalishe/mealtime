import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Безопасно: для Capacitor нужен относительный путь, для веба - абсолютный
  // Если CAPACITOR не установлен, ведет себя как раньше (undefined = '/')
  base: process.env.CAPACITOR ? './' : undefined,
})
