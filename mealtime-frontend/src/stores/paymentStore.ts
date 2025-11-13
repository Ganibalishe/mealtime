import { create } from 'zustand';
import api from '../services/api';
import type { CreatePaymentResponse } from '../types';

interface PaymentStore {
  // Состояние
  paymentLoading: boolean;
  paymentError: string | null;
  cancelLoading: boolean;

  // Действия
  createPayment: (premiumMealPlanId: string) => Promise<CreatePaymentResponse>;
  checkPaymentStatus: (purchaseId: string) => Promise<void>;
  cancelPurchase: (premiumMealPlanId: string) => Promise<void>;
  clearPaymentError: () => void;
}

export const usePaymentStore = create<PaymentStore>((set) => ({
  // Начальное состояние
  paymentLoading: false,
  paymentError: null,
  cancelLoading: false,

  // Создание платежа
  createPayment: async (premiumMealPlanId: string) => {
    set({ paymentLoading: true, paymentError: null });

    try {
      const response = await api.post('/payments/create/', {
        premium_meal_plan_id: premiumMealPlanId
      });

      set({ paymentLoading: false });
      return response.data;
    } catch (error: any) {
      set({
        paymentError: error.response?.data?.error || 'Ошибка создания платежа',
        paymentLoading: false
      });
      throw error;
    }
  },

  // Проверка статуса платежа
  checkPaymentStatus: async (purchaseId: string) => {
    console.log('Checking payment status for:', purchaseId);
  },

  // Отмена покупки
  cancelPurchase: async (premiumMealPlanId: string) => {
    set({ cancelLoading: true, paymentError: null });

    try {
      await api.post(`/premium-meal-plans/${premiumMealPlanId}/cancel_purchase/`);
      set({ cancelLoading: false });
    } catch (error: any) {
      set({
        paymentError: error.response?.data?.error || 'Ошибка отмены покупки',
        cancelLoading: false
      });
      throw error;
    }
  },

  // Очистка ошибок
  clearPaymentError: () => set({ paymentError: null }),
}));