import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  structuredData?: object;
  robots?: string;
  keywords?: string;
  author?: string;
  articlePublishedTime?: string;
  articleModifiedTime?: string;
}

const SeoHead: React.FC<SeoHeadProps> = ({
  title = 'Mealtime Planner - Планировщик питания и рецептов',
  description = 'Планируйте питание на неделю, создавайте меню, генерируйте списки покупок. Умный планировщик питания с автоматической генерацией списков покупок.',
  canonicalUrl = 'https://mealtime-planner.ru',
  ogImage = 'https://mealtime-planner.ru/og-image.jpg',
  ogType = 'website',
  structuredData,
  robots = 'index, follow',
  keywords = 'планировщик питания, рецепты, меню на неделю, список покупок, готовка, кулинария, meal planning',
  author = 'Mealtime Planner',
  articlePublishedTime,
  articleModifiedTime
}) => {
  const fullTitle = title.includes('Mealtime Planner') ? title : `${title} | Mealtime Planner`;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `https://mealtime-planner.ru${ogImage}`;

  return (
    <Helmet>
      {/* Базовые мета-теги */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={robots} />
      <meta name="author" content={author} />
      <meta name="language" content="Russian" />
      <meta name="revisit-after" content="7 days" />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph - расширенная версия */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:site_name" content="Mealtime Planner" />
      <meta property="og:locale" content="ru_RU" />
      {articlePublishedTime && <meta property="article:published_time" content={articlePublishedTime} />}
      {articleModifiedTime && <meta property="article:modified_time" content={articleModifiedTime} />}

      {/* Twitter Card - расширенная версия */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      <meta name="twitter:image:alt" content={fullTitle} />
      <meta name="twitter:site" content="@mealtimeplanner" />

      {/* Дополнительные мета-теги для мобильных */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="Mealtime Planner" />

      {/* Структурированные данные (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SeoHead;