/**
 * Кастомные классы ошибок
 */

// Базовый класс для ошибок приложения
export class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Билет не найден
export class TicketNotFoundError extends AppError {
  constructor() {
    super('Билет с заданными критериями не найден');
  }
}

// Ошибка парсинга DOM
export class DOMParseError extends AppError {
  constructor(details) {
    super(`Ошибка парсинга страницы: ${details}`);
  }
}

// Ошибка сети
export class NetworkError extends AppError {
  constructor(details) {
    super(`Ошибка сети: ${details}`);
  }
}

// Пользователь не авторизован
export class NotAuthorizedError extends AppError {
  constructor() {
    super('Пользователь не авторизован на сайте');
  }
}

// Недостаточно средств
export class InsufficientFundsError extends AppError {
  constructor(required, available) {
    super(`Недостаточно средств. Требуется: ${required}₽, доступно: ${available}₽`);
  }
}

/**
 * Логирование ошибок
 */
export function logError(error, context = '') {
  console.error(`[${context}]`, error.name, error.message);
  if (error.stack) {
    console.error(error.stack);
  }
}
