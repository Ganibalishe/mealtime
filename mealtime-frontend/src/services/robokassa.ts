// services/robokassa.ts
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

  // Загрузка скрипта Robokassa
  loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.scriptLoaded) {
        resolve();
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
  startPayment(params: RobokassaPaymentParams): void {
    if (!this.scriptLoaded) {
      throw new Error('Скрипт Robokassa не загружен');
    }

    if (window.Robokassa && window.Robokassa.StartPayment) {
      console.log('Starting Robokassa payment with params:', params);
      window.Robokassa.StartPayment(params);
    } else {
      throw new Error('Robokassa API не доступно');
    }
  }

  // Рендер платежного виджета (альтернативный метод)
  renderPayment(params: any): void {
    if (!this.scriptLoaded) {
      throw new Error('Скрипт Robokassa не загружен');
    }

    if (window.Robokassa && window.Robokassa.Render) {
      window.Robokassa.Render(params);
    } else {
      throw new Error('Robokassa API не доступно');
    }
  }
}

export const robokassaService = new RobokassaService();