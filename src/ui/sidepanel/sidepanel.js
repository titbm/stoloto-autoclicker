/**
 * Sidepanel UI - интерфейс расширения
 */

import { ChromeAdapter } from '../../adapters/ChromeAdapter.js';
import { SearchCriteria } from '../../domain/SearchCriteria.js';
import { MESSAGE_TYPES } from '../../shared/messaging.js';
import { PRICES, SEARCH_MODES } from '../../shared/constants.js';

const TICKET_PRICE = PRICES.TICKET_PRICE;

const chromeAdapter = new ChromeAdapter();

// Элементы UI - статусы загрузки
const loadingStatus = document.getElementById('loadingStatus');
const pageLoadingMsg = document.getElementById('pageLoadingMsg');
const authCheckMsg = document.getElementById('authCheckMsg');
const searchStageMsg = document.getElementById('searchStageMsg');

// Элементы UI - форма
const searchForm = document.getElementById('searchForm');
const searchNumbersInput = document.getElementById('searchNumbers');
const excludeNumbersInput = document.getElementById('excludeNumbers');
const searchModeSelect = document.getElementById('searchMode');
const ticketsToBuyInput = document.getElementById('ticketsToBuy');
const testModeCheckbox = document.getElementById('testMode');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const searchStatusContainer = document.getElementById('searchStatusContainer');
const searchStatus = document.getElementById('searchStatus');
const lastSearchResultContainer = document.getElementById('lastSearchResultContainer');
const lastSearchResult = document.getElementById('lastSearchResult');

// Состояние
let isSearching = false;
let currentTabId = null;
let userBalance = 0;

// Обработчики
startBtn.addEventListener('click', startSearch);
stopBtn.addEventListener('click', stopSearch);

// Валидация ввода в реальном времени
searchNumbersInput.addEventListener('input', validateInput);
excludeNumbersInput.addEventListener('input', validateInput);

// Автоматическая очистка при потере фокуса
searchNumbersInput.addEventListener('blur', function () {
  if (this.value.trim()) {
    cleanAndValidateNumbers(this, this.value);
  }
});

excludeNumbersInput.addEventListener('blur', function () {
  if (this.value.trim()) {
    cleanAndValidateNumbers(this, this.value);
  }
});

// Валидация количества билетов с учетом баланса
ticketsToBuyInput.addEventListener('input', function () {
  validateTicketsToBuy(this);
});

// Слушаем сообщения от background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, data } = message;
  
  console.log('📨 Sidepanel получил сообщение:', type, data);
  
  switch (type) {
    case MESSAGE_TYPES.SEARCH_STATUS:
      showStatus(data.status);
      break;
    
    case MESSAGE_TYPES.TICKET_FOUND:
      // Статус уже установлен из SearchTickets, запрашиваем полное состояние
      stopSearchUI();
      setTimeout(async () => {
        if (currentTabId) {
          const response = await chromeAdapter.sendMessage(MESSAGE_TYPES.CHECK_SEARCH_STATUS, {
            tabId: currentTabId
          });
          if (response?.searchState) {
            showLastSearchResult(response.searchState);
          }
        }
      }, 100);
      break;
      
    case MESSAGE_TYPES.SEARCH_PROGRESS:
      showStatus(`🔍 Ищем подходящие билеты. Проверено: ${data.checked}`);
      break;
      
    case MESSAGE_TYPES.SEARCH_STOPPED:
      // Статус уже установлен из background через SEARCH_STATUS
      stopSearchUI();
      // Запрашиваем состояние чтобы показать результат
      setTimeout(async () => {
        if (currentTabId) {
          const response = await chromeAdapter.sendMessage(MESSAGE_TYPES.CHECK_SEARCH_STATUS, {
            tabId: currentTabId
          });
          if (response?.searchState) {
            showLastSearchResult(response.searchState);
          }
        }
      }, 100);
      break;
      
    case MESSAGE_TYPES.ERROR:
      console.log('❌ Обрабатываем ERROR в sidepanel');
      showStatus(`❌ Ошибка: ${data.error}`);
      stopSearchUI();
      // Запрашиваем полное состояние для отображения
      setTimeout(async () => {
        if (currentTabId) {
          const response = await chromeAdapter.sendMessage(MESSAGE_TYPES.CHECK_SEARCH_STATUS, {
            tabId: currentTabId
          });
          if (response?.searchState) {
            showLastSearchResult(response.searchState);
          }
        }
      }, 100);
      break;
      
    case MESSAGE_TYPES.OUR_TAB_CLOSED:
      console.log('🚪 Наша вкладка закрыта, закрываем sidepanel');
      setTimeout(() => window.close(), 0);
      break;
      
    case MESSAGE_TYPES.AUTH_CHANGED:
      console.log('🔄 Авторизация изменилась, перезагружаем sidepanel');
      setTimeout(() => window.location.reload(), 500);
      break;
      
    case MESSAGE_TYPES.CLOSE_SIDEPANEL:
      console.log('🚪 Закрываем sidepanel');
      setTimeout(() => window.close(), 0);
      break;
  }
  
  // Отправляем ответ чтобы не было ошибки "message channel closed"
  sendResponse({ received: true });
});

/**
 * Запустить поиск
 */
async function startSearch() {
  console.log('🚀 startSearch вызван');
  
  // НЕ скрываем результат предыдущего поиска - он должен быть всегда виден
  
  // Защита от повторного запуска
  if (isSearching) {
    console.log('⚠️ Поиск уже запущен, игнорируем');
    return;
  }
  
  try {
    // Сохраняем режим тестирования
    await chromeAdapter.saveLocal('testMode', testModeCheckbox.checked);
    if (testModeCheckbox.checked) {
      console.log('🧪 Включен тестовый режим - реальная покупка НЕ будет выполнена');
    }
    // Очищаем и валидируем основные числа
    const numbersValidation = cleanAndValidateNumbers(searchNumbersInput, searchNumbersInput.value);
    const searchNumbers = numbersValidation.validNumbers;

    // Очищаем и валидируем исключаемые числа
    const excludeValidation = cleanAndValidateNumbers(excludeNumbersInput, excludeNumbersInput.value);
    let excludeNumbers = excludeValidation.validNumbers;

    // Проверка на дублирование чисел между полями поиска и исключений
    const duplicateCheck = removeDuplicateNumbers(searchNumbers, excludeNumbers);
    if (duplicateCheck.hasDuplicates) {
      console.log(`Обнаружены и удалены пересекающиеся числа: ${duplicateCheck.duplicates.join(', ')}`);
    }

    // Используем отфильтрованный список исключений
    excludeNumbers = duplicateCheck.filteredExcludeNumbers;

    const mode = searchModeSelect.value || SEARCH_MODES.ANYWHERE;
    const ticketsToBuy = parseInt(ticketsToBuyInput.value) || 0;
    
    console.log('📝 Параметры поиска:', { searchNumbers, excludeNumbers, mode, ticketsToBuy });
    
    // Валидация
    if (searchNumbers.length === 0) {
      console.log('❌ Числа для поиска не введены');
      showStatus('❌ Введите корректные числа от 1 до 90');
      return;
    }
    
    // Если больше 7 чисел - логируем
    if (searchNumbers.length > 7) {
      console.log(`⚠️ Введено ${searchNumbers.length} чисел. В фильтр будет отправлено первые 7, но поиск будет по всем числам`);
    }
    
    // Валидация по десяткам в зависимости от режима
    const decadeValidation = validateNumbersByDecade(searchNumbers, mode);
    if (!decadeValidation.valid) {
      console.log('❌ Невозможные критерии поиска:', decadeValidation.message);
      showStatus(`❌ Невозможные критерии поиска: ${decadeValidation.message}`);
      highlightInputWithError(searchNumbersInput);
      return;
    }
    
    // Создаем критерии
    const criteria = new SearchCriteria(
      searchNumbers,
      excludeNumbers,
      mode,
      ticketsToBuy
    );
    
    console.log('✅ Критерии созданы:', criteria);
    
    console.log('📋 Используем вкладку:', currentTabId);
    
    // Обновляем UI сразу
    startSearchUI();
    // Статус придет от background
    
    console.log('📤 Отправляем START_SEARCH в background');
    
    // Отправляем команду в background
    await chromeAdapter.sendMessage(MESSAGE_TYPES.START_SEARCH, {
      criteria: criteria,
      tabId: currentTabId
    });
    
    // Статус будет обновляться через сообщения от background (SEARCH_PROGRESS, TICKET_FOUND, etc.)
    
  } catch (error) {
    console.error('❌ Ошибка в startSearch:', error);
    showStatus(`❌ Ошибка: ${error.message}`);
    stopSearchUI();
  }
}

/**
 * Остановить поиск
 */
async function stopSearch() {
  console.log('⏸️ stopSearch вызван, currentTabId:', currentTabId);
  
  if (!currentTabId) {
    console.log('⚠️ currentTabId не установлен');
    stopSearchUI();
    return;
  }
  
  // Показываем промежуточное состояние
  stopBtn.textContent = '⏳ Останавливаем поиск...';
  stopBtn.disabled = true;
  showStatus('⏳ Останавливаем поиск...');
  
  console.log('📋 Отправляем STOP_SEARCH для вкладки:', currentTabId);
  await chromeAdapter.sendMessage(MESSAGE_TYPES.STOP_SEARCH, {
    tabId: currentTabId
  });
  // Статус обновится когда придет SEARCH_STOPPED от background
}

/**
 * Парсинг чисел из строки
 * Поддерживает разделители: пробел, запятая, точка с запятой
 */
function parseNumbers(str) {
  if (!str.trim()) return [];
  
  // Разделяем по любым не-цифровым символам
  return str
    .split(/[,;\s]+/)
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n) && n >= 1 && n <= 90);
}

/**
 * Валидация и очистка чисел
 */
function cleanAndValidateNumbers(inputElement, inputValue) {
  const originalNumbers = inputValue.split(/[,\s]+/)
    .map(num => num.trim())
    .filter(num => num !== '');

  const validNumbers = [];
  const invalidNumbers = [];
  const duplicates = [];

  // Проверяем каждое число
  originalNumbers.forEach(numStr => {
    const num = parseInt(numStr);

    if (isNaN(num) || num < 1 || num > 90) {
      invalidNumbers.push(numStr);
    } else {
      // Проверяем на дубликаты
      if (validNumbers.includes(num)) {
        duplicates.push(num);
      } else {
        validNumbers.push(num);
      }
    }
  });

  // Определяем, были ли ошибки
  const hasErrors = invalidNumbers.length > 0 || duplicates.length > 0;

  if (hasErrors) {
    // Обновляем значение поля только валидными числами
    inputElement.value = validNumbers.join(', ');

    // Подсвечиваем поле с ошибкой
    highlightInputWithError(inputElement);

    // Логируем информацию об ошибках
    if (invalidNumbers.length > 0) {
      console.log(`Удалены неподходящие числа: ${invalidNumbers.join(', ')}`);
    }
    if (duplicates.length > 0) {
      console.log(`Удалены дублирующиеся числа: ${duplicates.join(', ')}`);
    }
  } else {
    // Если ошибок нет, просто форматируем
    inputElement.value = validNumbers.join(', ');
  }

  return {
    validNumbers,
    hasErrors,
    invalidNumbers,
    duplicates
  };
}

/**
 * Проверка пересечения чисел для поиска и исключения
 */
function removeDuplicateNumbers(numbers, excludeNumbers) {
  // Находим дубликаты
  const duplicates = numbers.filter(num => excludeNumbers.includes(num));

  // Если дубликаты найдены, удаляем их из списка исключений
  if (duplicates.length > 0) {
    // Создаем новый массив без дублирующихся чисел
    const filteredExcludeNumbers = excludeNumbers.filter(num => !numbers.includes(num));

    // Обновляем поле ввода исключений
    excludeNumbersInput.value = filteredExcludeNumbers.join(', ');

    // Визуально выделяем поле ввода исключений
    highlightInputWithError(excludeNumbersInput);

    console.log(`Удалены пересекающиеся числа из исключений: ${duplicates.join(', ')}`);

    return {
      hasDuplicates: true,
      duplicates: duplicates,
      filteredExcludeNumbers: filteredExcludeNumbers
    };
  }

  return {
    hasDuplicates: false,
    duplicates: [],
    filteredExcludeNumbers: excludeNumbers
  };
}

/**
 * Визуальное выделение поля с ошибкой
 */
function highlightInputWithError(inputElement) {
  // Сохраняем оригинальный стиль
  const originalBorder = inputElement.style.border;
  const originalBoxShadow = inputElement.style.boxShadow;

  // Подсвечиваем красным с тенью
  inputElement.style.border = '2px solid #f44336';
  inputElement.style.boxShadow = '0 0 5px rgba(244, 67, 54, 0.5)';

  // Восстанавливаем через 2 секунды
  setTimeout(() => {
    inputElement.style.border = originalBorder;
    inputElement.style.boxShadow = originalBoxShadow;
  }, 2000);
}

/**
 * Валидация ввода в реальном времени
 */
function validateInput(event) {
  const allowedPattern = /^[0-9,\s]*$/;
  const inputValue = event.target.value;

  // Блокируем недопустимые символы
  if (!allowedPattern.test(inputValue)) {
    event.target.value = inputValue.replace(/[^0-9,\s]/g, '');
  }
}

/**
 * Валидация количества билетов с учетом баланса
 */
function validateTicketsToBuy(inputElement) {
  let ticketsCount = parseInt(inputElement.value) || 0;
  
  // Не может быть отрицательным
  if (ticketsCount < 0) {
    inputElement.value = 0;
    return;
  }
  
  // Вычисляем максимально возможное количество
  const maxTickets = Math.floor(userBalance / TICKET_PRICE);
  
  // Если введено больше чем можно купить - ограничиваем
  if (ticketsCount > maxTickets) {
    console.log(`⚠️ Ограничение: максимум ${maxTickets} билетов на баланс ${userBalance}₽`);
    inputElement.value = maxTickets;
  }
}

/**
 * Валидация чисел по десяткам в зависимости от режима поиска
 * Десятки: 1-9, 10-19, 20-29, ..., 70-79, 80-90
 */
function validateNumbersByDecade(numbers, mode) {
  // Группируем числа по десяткам
  const decades = {};
  
  numbers.forEach(num => {
    let decade;
    if (num >= 1 && num <= 9) {
      decade = '1-9';
    } else if (num >= 80 && num <= 90) {
      decade = '80-90';
    } else {
      // 10-19, 20-29, ..., 70-79
      const decadeStart = Math.floor(num / 10) * 10;
      decade = `${decadeStart}-${decadeStart + 9}`;
    }
    
    if (!decades[decade]) {
      decades[decade] = [];
    }
    decades[decade].push(num);
  });
  
  // Определяем максимум чисел из одного десятка в зависимости от режима
  let maxPerDecade;
  let modeName;
  
  switch (mode) {
    case SEARCH_MODES.SAME_ROW:
      maxPerDecade = 1; // В одной строке не может быть больше 1 числа из десятка
      modeName = 'одной строке';
      break;
    case SEARCH_MODES.SAME_HALF:
      maxPerDecade = 2; // В половине билета не может быть больше 2 чисел из десятка
      modeName = 'одной половине';
      break;
    case SEARCH_MODES.ANYWHERE:
      maxPerDecade = 4; // Во всем билете не может быть больше 4 чисел из десятка
      modeName = 'билете';
      break;
    default:
      return { valid: true };
  }
  
  // Проверяем каждый десяток
  for (const decade in decades) {
    const numbersInDecade = decades[decade];
    if (numbersInDecade.length > maxPerDecade) {
      return {
        valid: false,
        message: `В ${modeName} не может быть больше ${maxPerDecade} ${maxPerDecade === 1 ? 'числа' : 'чисел'} из десятка ${decade}. Найдено: ${numbersInDecade.join(', ')}`
      };
    }
  }
  
  return { valid: true };
}

/**
 * Показать статус поиска
 */
function showStatus(text) {
  console.log('📊 Обновление статуса:', text);
  searchStatus.textContent = text;
  searchStatusContainer.classList.remove('hidden');
}

/**
 * Показать результат последнего поиска
 */
function showLastResult(text) {
  console.log('📊 Результат последнего поиска:', text);
  lastSearchResult.textContent = text;
  lastSearchResultContainer.classList.remove('hidden');
}



/**
 * UI при запуске поиска
 */
function startSearchUI() {
  isSearching = true;
  startBtn.classList.add('hidden');
  stopBtn.classList.remove('hidden');
  stopBtn.textContent = '⏸️ Остановить'; // Сбрасываем текст кнопки
  stopBtn.disabled = false; // Разблокируем кнопку
  searchNumbersInput.disabled = true;
  excludeNumbersInput.disabled = true;
  searchModeSelect.disabled = true;
  ticketsToBuyInput.disabled = true;
}

/**
 * UI при остановке поиска
 */
function stopSearchUI() {
  isSearching = false;
  startBtn.classList.remove('hidden');
  stopBtn.classList.add('hidden');
  searchNumbersInput.disabled = false;
  excludeNumbersInput.disabled = false;
  searchModeSelect.disabled = false;
  ticketsToBuyInput.disabled = false;
}

// Инициализация при загрузке
async function init() {
  // 1. Уведомляем background что sidepanel открылся и получаем tabId
  const response = await chromeAdapter.sendMessage(MESSAGE_TYPES.SIDEPANEL_OPENED, {});
  if (response?.tabId) {
    currentTabId = response.tabId;
    console.log('📋 Получен tabId от background:', currentTabId);
  }
  
  // 2. Ждем готовности страницы
  await waitForPageReady();
  
  // 3. Проверяем авторизацию
  await checkAuthorization();
  
  // 4. Проверяем этап поиска и получаем статусы
  const statuses = await checkSearchStage();
  
  // 5. Показываем форму со статусами
  showSearchForm(statuses);
}

// Проверяем этап поиска
async function checkSearchStage() {
  searchStageMsg.classList.remove('hidden');
  searchStageMsg.textContent = '🔍 Получаем статус поиска...';
  
  try {
    // Загружаем оба статуса из storage
    const lastStatus = await chromeAdapter.getLocal('lastSearchStatus');
    const lastState = await chromeAdapter.getLocal('lastSearchState');
    
    console.log('📦 Загружено из storage:', { lastStatus, lastState });
    
    let resultToShow = null;
    let statusToShow = null;
    
    if (!currentTabId) {
      // Вкладки нет - используем данные из storage
      if (lastState) {
        resultToShow = lastState;
        // Восстанавливаем параметры из последнего поиска
        if (lastState.criteria) {
          restoreSearchParams(lastState.criteria);
        }
      }
      
      if (lastStatus) {
        statusToShow = lastStatus;
      }
      
      searchStageMsg.textContent = '✅ Статус поиска получен';
      searchStageMsg.style.color = '';
      
      return { lastSearchResult: resultToShow, currentStatus: statusToShow };
    }
    
    // Запрашиваем у background статус поиска
    const response = await chromeAdapter.sendMessage(MESSAGE_TYPES.CHECK_SEARCH_STATUS, {
      tabId: currentTabId
    });
    
    if (response?.isSearching) {
      console.log('🔍 Обнаружен активный поиск, восстанавливаем UI');
      startSearchUI();
      
      // Показываем текущий статус активного поиска
      if (lastStatus) {
        statusToShow = lastStatus;
      }
      
      // Показываем результат ПРЕДЫДУЩЕГО завершенного поиска
      if (lastState && lastState.status !== 'running') {
        resultToShow = lastState;
      }
      
      // Восстанавливаем параметры текущего поиска
      if (response.searchState?.criteria) {
        restoreSearchParams(response.searchState.criteria);
      }
    } else {
      // Поиск не активен - восстанавливаем результат последнего поиска
      if (response?.searchState) {
        resultToShow = response.searchState;
        if (response.searchState.criteria) {
          restoreSearchParams(response.searchState.criteria);
        }
      } else if (lastState) {
        // Если нет в памяти, используем из storage
        resultToShow = lastState;
        if (lastState.criteria) {
          restoreSearchParams(lastState.criteria);
        }
      }
      
      // Показываем последний статус если есть
      if (lastStatus) {
        statusToShow = lastStatus;
      }
    }
    
    searchStageMsg.textContent = '✅ Статус поиска получен';
    searchStageMsg.style.color = '';
    
    return { lastSearchResult: resultToShow, currentStatus: statusToShow };
    
  } catch (error) {
    console.error('❌ Ошибка проверки этапа поиска:', error);
    searchStageMsg.textContent = '⚠️ Ошибка получения статуса поиска';
    searchStageMsg.style.color = 'orange';
    return null;
  }
}

// Показать результат последнего поиска из состояния
function showLastSearchResult(state) {
  if (!state) return;
  
  let resultText = '';
  
  // Форматируем дату-время
  let dateTimeStr = '';
  if (state.stoppedAt) {
    const date = new Date(state.stoppedAt);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    dateTimeStr = `${day}.${month}.${year} ${hours}:${minutes}`;
  }
  
  // Формируем текст в зависимости от статуса
  switch (state.status) {
    case 'running':
      // Поиск был прерван, показываем последний прогресс
      resultText = `⚠️ Поиск был прерван`;
      resultText += `\n📊 Проверено: ${state.ticketsChecked || 0}`;
      break;
      
    case 'completed':
      resultText = `✅ Завершен успешно`;
      if (dateTimeStr) resultText += ` (${dateTimeStr})`;
      resultText += `\n📊 Проверено: ${state.ticketsChecked}`;
      resultText += ` | Найдено: ${state.ticketsFound}`;
      if (state.ticketsPurchased > 0) {
        resultText += ` | Куплено: ${state.ticketsPurchased}`;
      }
      break;
      
    case 'stopped':
      resultText = `⏸️ Остановлен пользователем`;
      if (dateTimeStr) resultText += ` (${dateTimeStr})`;
      resultText += `\n📊 Проверено: ${state.ticketsChecked}`;
      if (state.ticketsPurchased > 0) {
        resultText += ` | Куплено: ${state.ticketsPurchased}`;
      }
      break;
      
    case 'error':
      resultText = `❌ Завершен с ошибкой`;
      if (dateTimeStr) resultText += ` (${dateTimeStr})`;
      resultText += `\n📊 Проверено: ${state.ticketsChecked}`;
      if (state.errorMessage) {
        resultText += `\n⚠️ ${state.errorMessage}`;
      }
      break;
  }
  
  if (resultText) {
    showLastResult(resultText);
  }
}

// Восстановить параметры поиска в форме
function restoreSearchParams(criteria) {
  console.log('📦 Восстанавливаем параметры поиска:', criteria);
  
  if (criteria.searchNumbers && criteria.searchNumbers.length > 0) {
    searchNumbersInput.value = criteria.searchNumbers.join(', ');
  }
  
  if (criteria.excludeNumbers && criteria.excludeNumbers.length > 0) {
    excludeNumbersInput.value = criteria.excludeNumbers.join(', ');
  }
  
  if (criteria.mode) {
    searchModeSelect.value = criteria.mode;
  }
  
  if (criteria.ticketsToBuy !== undefined) {
    ticketsToBuyInput.value = criteria.ticketsToBuy;
  }
}

// Ждем готовности страницы
async function waitForPageReady() {
  console.log('⏳ Ждем загрузки страницы Столото...');
  
  if (!currentTabId) {
    pageLoadingMsg.textContent = '⚠️ Откройте страницу Столото';
    console.log('⚠️ currentTabId не установлен');
    return;
  }
  
  // Опрашиваем content script каждые 500ms
  let attempts = 0;
  const maxAttempts = 30; // 30 × 500ms = 15 секунд
  
  while (attempts < maxAttempts) {
    try {
      const response = await chromeAdapter.sendMessage(
        MESSAGE_TYPES.CHECK_PAGE_LOADED,
        { tabId: currentTabId }
      );
      
      if (response?.loaded) {
        console.log('✅ Страница загружена');
        pageLoadingMsg.textContent = '✅ Страница загружена';
        return;
      }
      
      console.log(`⏳ Попытка ${attempts + 1}/${maxAttempts}... Страница еще загружается`);
    } catch (error) {
      console.log(`⏳ Попытка ${attempts + 1}/${maxAttempts}... Ошибка:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  
  pageLoadingMsg.textContent = '⚠️ Страница загружается слишком долго';
  console.log('⚠️ Превышено время ожидания');
}

// Проверяем авторизацию и баланс
async function checkAuthorization() {
  authCheckMsg.classList.remove('hidden');
  authCheckMsg.textContent = '⏳ Проверка авторизации...';
  
  try {
    if (!currentTabId) {
      authCheckMsg.textContent = '⚠️ Откройте страницу Столото';
      authCheckMsg.style.color = 'orange';
      document.querySelector('#ticketsToBuy').closest('.field').style.display = 'none';
      ticketsToBuyInput.value = '0';
      return;
    }
    
    console.log('🔐 Проверяем авторизацию на вкладке:', currentTabId);
    
    // Отправляем один запрос и ждем ответа
    const response = await chromeAdapter.sendMessage(
      MESSAGE_TYPES.GET_USER_DATA,
      { tabId: currentTabId }
    );
    
    console.log('📨 Ответ от background:', response);
    
    if (!response) {
      throw new Error('Нет ответа от content script');
    }
    
    const userData = response;
    console.log('👤 UserData:', userData);
    
    if (userData.isAuthorized) {
      console.log('✅ Пользователь авторизован, баланс:', userData.balance);
      userBalance = userData.balance;
      
      authCheckMsg.textContent = `✅ Авторизован. Баланс: ${userBalance}₽`;
      authCheckMsg.style.color = '';
      
      if (userBalance > 0) {
        // Устанавливаем максимум для поля
        const maxTickets = Math.floor(userBalance / TICKET_PRICE);
        ticketsToBuyInput.max = maxTickets;
        
        // Показываем поле покупки
        document.querySelector('#ticketsToBuy').closest('.field').style.display = 'block';
        
        // Валидируем текущее значение поля
        if (ticketsToBuyInput.value) {
          validateTicketsToBuy(ticketsToBuyInput);
        }
      } else {
        // Баланс 0 - скрываем поле покупки
        document.querySelector('#ticketsToBuy').closest('.field').style.display = 'none';
        ticketsToBuyInput.value = '0';
      }
    } else {
      console.log('❌ Пользователь не авторизован');
      authCheckMsg.textContent = '❌ Не авторизован. Войдите на сайте.';
      authCheckMsg.style.color = 'red';
      document.querySelector('#ticketsToBuy').closest('.field').style.display = 'none';
      ticketsToBuyInput.value = '0';
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки авторизации:', error);
    authCheckMsg.textContent = '⚠️ Ошибка проверки авторизации';
    authCheckMsg.style.color = 'orange';
    document.querySelector('#ticketsToBuy').closest('.field').style.display = 'none';
    ticketsToBuyInput.value = '0';
  }
}

// Показать форму поиска
function showSearchForm(statuses) {
  // Сначала вставляем статусы в форму
  if (statuses) {
    if (statuses.lastSearchResult) {
      showLastSearchResult(statuses.lastSearchResult);
    }
    if (statuses.currentStatus) {
      showStatus(statuses.currentStatus);
    }
  }
  
  // Потом показываем форму
  loadingStatus.classList.add('hidden');
  searchForm.classList.remove('hidden');
}



// Запускаем инициализацию
init();

console.log('✅ Sidepanel загружен');
