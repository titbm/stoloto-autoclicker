/**
 * Данные пользователя с сайта Столото
 */
export class UserData {
  constructor(isAuthorized, balance, ticketPrice) {
    this.isAuthorized = isAuthorized; // Авторизован ли пользователь
    this.balance = balance;           // Баланс кошелька
    this.ticketPrice = ticketPrice;   // Цена одного билета
  }

  canAfford(ticketsCount) {
    return this.balance >= this.ticketPrice * ticketsCount;
  }
}
