import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Получаем __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация
const BASE_URL = 'https://mealtime-planner.ru';
const API_URL = process.env.API_URL || 'https://mealtime-planner.ru/api';

// Функция для генерации sitemap
async function generateSitemap() {
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  const today = new Date().toISOString().split('T')[0];

  // Статические страницы
  const staticPages = [
    {
      url: '/',
      priority: '1.0',
      changefreq: 'daily',
      lastmod: today
    },
    {
      url: '/recipes',
      priority: '0.9',
      changefreq: 'weekly',
      lastmod: today
    },
    {
      url: '/premium-menus',
      priority: '0.95',
      changefreq: 'weekly',
      lastmod: today
    }
  ];

  // Добавляем статические страницы
  staticPages.forEach(page => {
    sitemap += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });

  // Получаем динамические данные из API
  try {
    const response = await axios.get(`${API_URL}/sitemap-data/`);
    const data = response.data;

    // Добавляем страницы премиум меню
    if (data.premium_menus && data.premium_menus.length > 0) {
      data.premium_menus.forEach(menu => {
        const lastmod = menu.lastmod ? menu.lastmod.split('T')[0] : today;
        sitemap += `  <url>
    <loc>${BASE_URL}/premium-menus/${menu.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
      });
    }

    // Добавляем страницы рецептов (только бесплатные)
    if (data.recipes && data.recipes.length > 0) {
      data.recipes.forEach(recipe => {
        const lastmod = recipe.lastmod ? recipe.lastmod.split('T')[0] : today;
        sitemap += `  <url>
    <loc>${BASE_URL}/recipes/${recipe.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      });
    }
  } catch (error) {
    console.warn('⚠️ Не удалось получить данные из API для sitemap:', error.message);
    console.warn('Продолжаем генерацию только со статическими страницами...');
  }

  sitemap += '</urlset>';

  // Сохраняем файл
  const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap);
  console.log('✅ Sitemap успешно сгенерирован:', sitemapPath);
}

// Запускаем генерацию
generateSitemap().catch(error => {
  console.error('❌ Ошибка при генерации sitemap:', error);
  process.exit(1);
});

export { generateSitemap };