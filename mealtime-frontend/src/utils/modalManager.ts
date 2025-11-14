// utils/modalManager.ts - Глобальный менеджер модальных окон для обработки кнопки "Назад"
type ModalCloseHandler = () => void;

class ModalManager {
  private modals: Map<string, ModalCloseHandler> = new Map();
  private counter = 0;

  // Регистрация модального окна
  register(closeHandler: ModalCloseHandler): string {
    const id = `modal-${this.counter++}`;
    this.modals.set(id, closeHandler);
    return id;
  }

  // Отмена регистрации модального окна
  unregister(id: string): void {
    this.modals.delete(id);
  }

  // Закрытие последнего открытого модального окна
  closeTopModal(): boolean {
    if (this.modals.size === 0) {
      return false;
    }

    // Получаем последний добавленный модальный окно (самый верхний)
    const lastEntry = Array.from(this.modals.entries()).pop();
    if (lastEntry) {
      const [, closeHandler] = lastEntry;
      closeHandler();
      return true;
    }

    return false;
  }

  // Проверка наличия открытых модальных окон
  hasOpenModals(): boolean {
    return this.modals.size > 0;
  }
}

// Singleton экземпляр
export const modalManager = new ModalManager();

