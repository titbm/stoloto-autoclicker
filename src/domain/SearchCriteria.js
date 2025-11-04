/**
 * Критерии поиска билетов
 */
export class SearchCriteria {
  constructor(searchNumbers, excludeNumbers, mode, ticketsToBuy = 0) {
    this.searchNumbers = searchNumbers;   // Числа которые должны быть
    this.excludeNumbers = excludeNumbers; // Числа которых не должно быть
    this.mode = mode;                     // 'anywhere', 'same_row', 'same_half'
    this.ticketsToBuy = ticketsToBuy;     // 0 = просто поиск, >0 = покупка
  }

  isSearchOnly() {
    return this.ticketsToBuy === 0;
  }

  isPurchaseMode() {
    return this.ticketsToBuy > 0;
  }
}
