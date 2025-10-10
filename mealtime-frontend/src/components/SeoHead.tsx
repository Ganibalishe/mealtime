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
}

const SeoHead: React.FC<SeoHeadProps> = ({
  title = 'Mealtime Planner - Планировщик питания и рецептов',
  description = 'Планируйте питание на неделю, создавайте меню, генерируйте списки покупок. Умный планировщик питания с автоматической генерацией списков покупок.',
  canonicalUrl = 'https://mealtime-planner.ru',
  ogImage = '/og-image.jpg',
  ogType = 'website',
  structuredData,
  robots = 'index, follow',
  keywords = 'планировщик питания, рецепты, меню на неделю, список покупок, готовка, кулинария, meal planning'
}) => {
  const fullTitle = title.includes('Mealtime Planner') ? title : `${title} | Mealtime Planner`;

  return (
    <Helmet>
      {/* Базовые мета-теги */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={robots} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Mealtime Planner" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

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