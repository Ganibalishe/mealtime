import { create } from 'zustand';
import api from '../services/api';
import type { CreatePaymentResponse, RobokassaPaymentParams } from '../types';

interface PaymentStore {
  // Состояние
  paymentLoading: boolean;
  paymentError: string | null;

  // Действия
  createPayment: (premiumMealPlanId: string) => Promise<CreatePaymentResponse>;
  checkPaymentStatus: (purchaseId: string) => Promise<void>;
  clearPaymentError: () => void;
}

export const usePaymentStore = create<PaymentStore>((set) => ({
  // Начальное состояние
  paymentLoading: false,
  paymentError: null,

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

  // Очистка ошибок
  clearPaymentError: () => set({ paymentError: null }),
}));