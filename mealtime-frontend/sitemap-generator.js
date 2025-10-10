import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация
const BASE_URL = 'https://mealtime-planner.ru';

// Функция для генерации sitemap
function generateSitemap() {
  console.log('Starting sitemap generation...');

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Статические страницы
  const staticPages = [
    {
      url: '/',
      priority: '1.0',
      changefreq: 'daily',
      lastmod: new Date().toISOString().split('T')[0]
    },
    {
      url: '/recipes',
      priority: '0.9',
      changefreq: 'weekly',
      lastmod: new Date().toISOString().split('T')[0]
    },
    {
      url: '/shopping-list',
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: new Date().toISOString().split('T')[0]
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

  sitemap += '</urlset>';

  // Сохраняем файл
  const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap);
  console.log(`Sitemap generated successfully! Total URLs: ${staticPages.length}`);
  console.log(`Sitemap saved to: ${sitemapPath}`);
}

// Запускаем генерацию
generateSitemap();

export { generateSitemap };