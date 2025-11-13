// services/robokassa.ts
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import type { RobokassaPaymentParams } from '../types';

declare global {
  interface Window {
    Robokassa: {
      StartPayment: (params: RobokassaPaymentParams) => void;
      Render: (params: any) => void;
    };
  }
}

class RobokassaService {
  private scriptLoaded = false;
  private scriptUrl = 'https://auth.robokassa.ru/Merchant/bundle/robokassa_iframe.js';

  // Загрузка скрипта Robokassa (только для веба)
  loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Для мобильных не загружаем скрипт
      if (Capacitor.isNativePlatform()) {
        this.scriptLoaded = true;
        resolve();
        return;
      }

      // Веб-логика (как раньше)
      if (this.scriptLoaded) {
        resolve();
        return;
      }

      if (typeof document === 'undefined') {
        reject(new Error('Document не доступен'));
        return;
      }

      if (document.querySelector(`script[src="${this.scriptUrl}"]`)) {
        this.scriptLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = this.scriptUrl;
      script.async = true;

      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Не удалось загрузить скрипт Robokassa'));
      };

      document.body.appendChild(script);
    });
  }

  // Запуск платежа
  async startPayment(params: RobokassaPaymentParams): Promise<void> {
    // Для мобильных используем In-App Browser
    if (Capacitor.isNativePlatform()) {
      try {
        // Логируем параметры для отладки
        console.log('🔵 Mobile payment params:', params);
        console.log('🔵 OutSum:', params.OutSum);

        // Формируем URL для платежа из параметров
        const paymentUrl = this.buildPaymentUrl(params);
        console.log('🔵 Payment URL:', paymentUrl);

        // Открываем в In-App Browser
        await Browser.open({
          url: paymentUrl,
          windowName: '_self'
        });
      } catch (error) {
        console.error('Ошибка при открытии платежа:', error);
        throw new Error('Не удалось открыть платежную страницу');
      }
      return;
    }

    // Веб-логика (как раньше)
    if (!this.scriptLoaded) {
      throw new Error('Скрипт Robokassa не загружен');
    }

    if (typeof window !== 'undefined' && window.Robokassa && window.Robokassa.StartPayment) {
      console.log('Starting Robokassa payment with params:', params);
      window.Robokassa.StartPayment(params);
    } else {
      throw new Error('Robokassa API не доступно');
    }
  }

  // Формирование URL для мобильных платежей
  private buildPaymentUrl(params: RobokassaPaymentParams): string {
    const baseUrl = 'https://auth.robokassa.ru/Merchant/Index.aspx';
    const urlParams = new URLSearchParams();

    // Добавляем все параметры напрямую из params
    // Robokassa требует следующие обязательные параметры:
    // MerchantLogin, OutSum, InvId, SignatureValue
    Object.entries(params).forEach(([key, value]) => {
      // Пропускаем вложенные объекты и функции
      if (value !== null && value !== undefined && typeof value !== 'object' && typeof value !== 'function') {
        const stringValue = String(value);
        urlParams.append(key, stringValue);
        // Логируем важные параметры
        if (key === 'OutSum' || key === 'MerchantLogin' || key === 'InvId') {
          console.log(`🔵 Adding param ${key}=${stringValue}`);
        }
      }
    });

    const finalUrl = `${baseUrl}?${urlParams.toString()}`;
    console.log('🔵 Final payment URL length:', finalUrl.length);
    console.log('🔵 URL contains OutSum:', urlParams.has('OutSum'));
    console.log('🔵 OutSum value:', urlParams.get('OutSum'));

    return finalUrl;
  }

  // Рендер платежного виджета (альтернативный метод) - только для веба
  renderPayment(params: any): void {
    if (Capacitor.isNativePlatform()) {
      throw new Error('renderPayment не поддерживается на мобильных платформах');
    }

    if (!this.scriptLoaded) {
      throw new Error('Скрипт Robokassa не загружен');
    }

    if (typeof window !== 'undefined' && window.Robokassa && window.Robokassa.Render) {
      window.Robokassa.Render(params);
    } else {
      throw new Error('Robokassa API не доступно');
    }
  }
}

export const robokassaService = new RobokassaService();