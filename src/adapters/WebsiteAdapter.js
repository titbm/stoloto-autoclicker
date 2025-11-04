/**
 * Адаптер для работы с DOM сайта Столото
 * Изолирует парсинг HTML - если сайт изменится, правим только этот файл
 */

import { Ticket } from '../domain/Ticket.js';
import { UserData } from '../domain/UserData.js';
import { DOMParseError } from '../shared/errors.js';
import { LIMITS, TIMEOUTS } from '../shared/constants.js';

export class WebsiteAdapter {
  /**
   * Получить все билеты с текущей страницы
   * @returns {Ticket[]} Массив билетов
   */
  getTickets() {
    const ticketButtons = Array.from(document.querySelectorAll('button'))
      .filter(btn => btn.textContent.includes('Билет №'));

    if (ticketButtons.length === 0) {
      throw new DOMParseError('Билеты не найдены на странице');
    }

    return ticketButtons.map(btn => {
      const ticketId = btn.textContent.match(/Билет №(\d+)/)?.[1];
      const numbers = this._extractNumbers(btn);

      if (!ticketId || numbers.length !== LIMITS.NUMBERS_PER_TICKET) {
        throw new DOMParseError(`Некорректный билет: ID=${ticketId}, чисел=${numbers.length}`);
      }

      return new Ticket(ticketId, numbers);
    });
  }

  /**
   * Извлечь числа из элемента билета
   * @private
   */
  _extractNumbers(ticketElement) {
    const numberElements = Array.from(ticketElement.querySelectorAll('*'))
      .filter(el => {
        const text = el.textContent?.trim();
        if (!text) return false;
        const num = parseInt(text);
        return !isNaN(num) && 
               num >= LIMITS.MIN_NUMBER && 
               num <= LIMITS.MAX_NUMBER && 
               text === num.toString();
      });

    return numberElements
      .map(el => parseInt(el.textContent.trim()))
      .slice(0, LIMITS.NUMBERS_PER_TICKET);
  }

  /**
   * Получить данные пользователя
   * @returns {UserData}
   */
  getUserData() {
    const isAuthorized = this._checkAuthorization();
    const balance = this._getBalance();
    const ticketPrice = this._getTicketPrice();

    return new UserData(isAuthorized, balance, ticketPrice);
  }

  /**
   * Проверить авторизацию
   * @private
   */
  _checkAuthorization() {
    const profileMenu = document.querySelector('[data-test-id="profile-menu"], .profile-menu, .user-profile');
    const userAvatar = document.querySelector('.user-avatar, .account-avatar, [data-test-id="user-avatar"]');
    const loginButton = Array.from(document.querySelectorAll('button, a'))
      .find(el => el.textContent.toLowerCase().includes('вход'));

    return (profileMenu || userAvatar) && !loginButton;
  }

  /**
   * Получить баланс
   * @private
   */
  _getBalance() {
    const balanceElements = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const text = el.textContent;
        return text && (text.includes('₽') || text.includes('руб'));
      });

    for (const el of balanceElements) {
      const match = el.textContent.match(/(\d+(?:\s?\d+)*)\s*(?:₽|руб)/);
      if (match) {
        const balance = parseInt(match[1].replace(/\s/g, ''));
        if (!isNaN(balance) && balance >= 0 && balance < 1000000) {
          return balance;
        }
      }
    }

    return 0;
  }

  /**
   * Получить цену билета
   * @private
   */
  _getTicketPrice() {
    // TODO: Парсить цену с сайта
    return 100; // Временно захардкодим
  }

  /**
   * Кликнуть по билету
   */
  clickTicket(ticketId) {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent.includes(`Билет №${ticketId}`));

    if (!btn) {
      throw new DOMParseError(`Билет №${ticketId} не найден`);
    }

    btn.click();
  }

  /**
   * Перейти на следующую страницу
   */
  async nextPage() {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent.trim() === 'Другие билеты');

    if (!btn) {
      throw new DOMParseError('Кнопка "Другие билеты" не найдена');
    }

    btn.click();
    await this._wait(TIMEOUTS.PAGE_LOAD);
  }

  /**
   * Проверить наличие следующей страницы
   */
  hasNextPage() {
    return Array.from(document.querySelectorAll('button'))
      .some(btn => btn.textContent.trim() === 'Другие билеты');
  }

  /**
   * Задержка
   * @private
   */
  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
