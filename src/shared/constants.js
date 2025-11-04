/**
 * Константы приложения
 */

// Режимы поиска
export const SEARCH_MODES = {
  ANYWHERE: 'anywhere',      // Числа где угодно в билете
  SAME_ROW: 'same_row',      // Числа в одной строке
  SAME_HALF: 'same_half'     // Числа в одной половине
};

// URL сайта Столото
export const STOLOTO_URL = 'https://www.stoloto.ru/ruslotto/game?viewType=tickets';

// Лимиты
export const LIMITS = {
  MIN_NUMBER: 1,             // Минимальное число в лото
  MAX_NUMBER: 90,            // Максимальное число в лото
  NUMBERS_PER_TICKET: 30,    // Чисел в билете
  ROWS_PER_TICKET: 6,        // Строк в билете
  NUMBERS_PER_ROW: 5         // Чисел в строке
};

// Таймауты (мс)
export const TIMEOUTS = {
  PAGE_LOAD: 2000,           // Ожидание загрузки страницы
  CLICK_DELAY: 500           // Задержка между кликами
};
