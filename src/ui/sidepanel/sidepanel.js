/**
 * Sidepanel UI - интерфейс расширения
 */

import { ChromeAdapter } from '../../adapters/ChromeAdapter.js';
import { SearchCriteria } from '../../domain/SearchCriteria.js';
import { MESSAGE_TYPES } from '../../shared/messaging.js';
import { SEARCH_MODES } from '../../shared/constants.js';

const chromeAdapter = new ChromeAdapter();

// Элементы UI - статусы загрузки
const loadingStatus = document.getElementById('loadingStatus');
const pageLoadingMsg = document.getElementById('pageLoadingMsg');
const authCheckMsg = document.getElementById('authCheckMsg');

// Элементы UI - форма
const searchForm = document.getElementById('searchForm');
const searchNumbersInput = document.getElementById('searchNumbers');
const excludeNumbersInput = document.getElementById('excludeNumbers');
const searchModeSelect = document.getElementById('searchMode');
const ticketsToBuyInput = document.getElementById('ticketsToBuy');
const testModeCheckbox = document.getElementById('testMode');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const searchStatus = document.getElementById('searchStatus');
const lastSearchResult = document.getElementById('lastSearchResult');

// Состояние
let isSearching = false;
let currentTabId = null;
let userBalance = 0;
const TICKET_PRICE = 150; // Цена одного билета

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
    case MESSAGE_TYPES.TICKET_FOUND:
      showStatus(`✅ Найдено билетов: ${data.tickets.length}`);
      showLastResult(`✅ Найдено билетов: ${data.tickets.length}`);
      stopSearchUI();
      break;
      
    case MESSAGE_TYPES.SEARCH_PROGRESS:
      showStatus(`🔍 Проверено билетов: ${data.checked}`);
      break;
      
    case MESSAGE_TYPES.SEARCH_STOPPED:
      showStatus('⏸️ Поиск остановлен');
      stopSearchUI();
      // Запрашиваем состояние чтобы показать результат
      setTimeout(async () => {
        const tabs = await chrome.tabs.query({ url: 'https://www.stoloto.ru/ruslotto/game*' });
        if (tabs.length > 0) {
          const response = await chromeAdapter.sendMessage(MESSAGE_TYPES.CHECK_SEARCH_STATUS, {
            tabId: tabs[0].id
          });
          if (response?.searchState) {
            const state = response.searchState;
            showLastResult(`⏸️ ${state.message} (проверено: ${state.ticketsChecked})`);
          }
        }
      }, 100);
      break;
      
    case MESSAGE_TYPES.ERROR:
      console.log('❌ Обрабатываем ERROR в sidepanel');
      showStatus(`❌ Ошибка: ${data.error}`);
      showLastResult(`❌ Ошибка: ${data.error}`);
      stopSearchUI();
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
    showStatus('⚠️ Поиск уже запущен');
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

    const mode = searchModeSelect.value;
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
    
    // Получаем активную вкладку
    const tab = await chromeAdapter.getActiveTab();
    currentTabId = tab.id;
    
    console.log('📋 Активная вкладка:', currentTabId);
    
    // Обновляем UI сразу
    startSearchUI();
    showStatus('🔍 Поиск запущен...');
    
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
  
  // Получаем вкладку Столото (не sidepanel)
  const tabs = await chrome.tabs.query({ url: 'https://www.stoloto.ru/ruslotto/game*' });
  const stolotoTab = tabs[0];
  
  if (stolotoTab) {
    console.log('📋 Отправляем STOP_SEARCH для вкладки:', stolotoTab.id);
    await chromeAdapter.sendMessage(MESSAGE_TYPES.STOP_SEARCH, {
      tabId: stolotoTab.id
    });
    // Статус обновится когда придет SEARCH_STOPPED от background
  } else {
    console.log('⚠️ Вкладка Столото не найдена');
    stopSearchUI();
    showStatus('⚠️ Вкладка не найдена');
  }
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
    case 'same_row':
      maxPerDecade = 1; // В одной строке не может быть больше 1 числа из десятка
      modeName = 'одной строке';
      break;
    case 'same_half':
      maxPerDecade = 2; // В половине билета не может быть больше 2 чисел из десятка
      modeName = 'одной половине';
      break;
    case 'anywhere':
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
  searchStatus.classList.remove('hidden');
}

/**
 * Показать результат последнего поиска
 */
function showLastResult(text) {
  console.log('📊 Результат последнего поиска:', text);
  console.log('📊 lastSearchResult элемент:', lastSearchResult);
  if (!lastSearchResult) {
    console.error('❌ lastSearchResult элемент не найден!');
    return;
  }
  lastSearchResult.textContent = text;
  lastSearchResult.classList.remove('hidden');
  console.log('✅ Результат показан, classList:', lastSearchResult.classList);
}



/**
 * UI при запуске поиска
 */
function startSearchUI() {
  isSearching = true;
  startBtn.classList.add('hidden');
  stopBtn.classList.remove('hidden');
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
  // 1. Уведомляем background что sidepanel открылся
  await chromeAdapter.sendMessage(MESSAGE_TYPES.SIDEPANEL_OPENED, {});
  
  // 2. Проверяем есть ли активный поиск
  await checkActiveSearch();
  
  // 3. Ждем готовности страницы
  await waitForPageReady();
  
  // 4. Проверяем авторизацию
  await checkAuthorization();
  
  // 5. Показываем форму
  showSearchForm();
}

// Проверяем есть ли активный поиск
async function checkActiveSearch() {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://www.stoloto.ru/ruslotto/game*' });
    
    if (tabs.length === 0) {
      // Вкладки нет, но показываем последний результат из storage
      const lastState = await chromeAdapter.getLocal('lastSearchState');
      if (lastState) {
        console.log('📦 Загружен последний результат из storage:', lastState);
        showLastSearchResult(lastState);
        // Восстанавливаем параметры из последнего поиска
        if (lastState.criteria) {
          restoreSearchParams(lastState.criteria);
        }
      }
      return;
    }
    
    const tab = tabs[0];
    currentTabId = tab.id;
    
    // Запрашиваем у background статус поиска
    const response = await chromeAdapter.sendMessage(MESSAGE_TYPES.CHECK_SEARCH_STATUS, {
      tabId: tab.id
    });
    
    if (response?.isSearching) {
      console.log('🔍 Обнаружен активный поиск, восстанавливаем UI');
      startSearchUI();
      const state = response.searchState;
      if (state) {
        showStatus(`🔍 Поиск запущен... Проверено: ${state.ticketsChecked}`);
        // Восстанавливаем параметры текущего поиска
        if (state.criteria) {
          restoreSearchParams(state.criteria);
        }
      } else {
        showStatus('🔍 Поиск запущен...');
      }
    } else {
      // Поиск не активен - восстанавливаем из последнего состояния
      if (response?.searchState) {
        showLastSearchResult(response.searchState);
        if (response.searchState.criteria) {
          restoreSearchParams(response.searchState.criteria);
        }
      } else {
        // Если нет в памяти, загружаем из storage
        const lastState = await chromeAdapter.getLocal('lastSearchState');
        if (lastState) {
          console.log('📦 Загружен последний результат из storage:', lastState);
          showLastSearchResult(lastState);
          if (lastState.criteria) {
            restoreSearchParams(lastState.criteria);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Ошибка проверки активного поиска:', error);
  }
}

// Показать результат последнего поиска из состояния
function showLastSearchResult(state) {
  if (!state || state.status === 'running') return;
  
  let resultText = '';
  
  switch (state.status) {
    case 'completed':
      resultText = `✅ Последний поиск: ${state.message} (проверено: ${state.ticketsChecked})`;
      break;
    case 'stopped':
      resultText = `⏸️ Последний поиск: ${state.message} (проверено: ${state.ticketsChecked})`;
      break;
    case 'error':
      resultText = `❌ Последний поиск: ${state.message} (проверено: ${state.ticketsChecked})`;
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
  console.log('⏳ Ждем готовности страницы Столото...');
  
  // Ищем вкладку Столото
  const tabs = await chrome.tabs.query({ url: 'https://www.stoloto.ru/ruslotto/game*' });
  
  if (tabs.length === 0) {
    pageLoadingMsg.textContent = '⚠️ Откройте страницу Столото';
    console.log('⚠️ Вкладка Столото не найдена');
    return;
  }
  
  const tab = tabs[0];
  
  // Проверяем готовность страницы - ждем пока появится интерфейс
  let attempts = 0;
  const maxAttempts = 30; // 30 попыток по 500мс = 15 секунд максимум
  let ready = false;
  
  while (attempts < maxAttempts && !ready) {
    try {
      // Проверяем готовность страницы: кнопки + баланс (если авторизован)
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const allButtons = Array.from(document.querySelectorAll('button'));
          
          // Ищем кнопку "Выбрать числа"
          const selectBtn = allButtons.find(b => b.textContent.trim() === 'Выбрать числа');
          if (!selectBtn) {
            // Или ищем кнопку редактирования (с SVG иконкой change)
            const editBtn = allButtons.find(b => {
              const svg = b.querySelector('svg use[href*="change"]');
              return !!svg;
            });
            
            if (!editBtn) return false;
          }
          
          // Проверяем авторизацию через cookie
          const cookies = document.cookie.split(';').map(c => c.trim());
          const gaCookie = cookies.find(c => c.startsWith('ga='));
          const isAuthorized = !!gaCookie;
          
          // Если авторизован, проверяем что баланс загрузился
          if (isAuthorized) {
            const walletLink = Array.from(document.querySelectorAll('a'))
              .find(a => a.href && a.href.includes('/private/wallet') && a.textContent.includes('₽'));
            
            // Баланс должен быть виден
            if (!walletLink) return false;
          }
          
          return true;
        }
      });
      
      if (result && result[0] && result[0].result) {
        console.log('✅ Интерфейс загружен, страница готова');
        ready = true;
        break;
      }
      
      console.log(`⏳ Попытка ${attempts + 1}/${maxAttempts}... Интерфейс еще не появился`);
    } catch (error) {
      console.log(`⏳ Попытка ${attempts + 1}/${maxAttempts}... Ошибка:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  
  if (!ready) {
    pageLoadingMsg.textContent = '⚠️ Страница загружается слишком долго';
    console.log('⚠️ Превышено время ожидания');
  } else {
    pageLoadingMsg.textContent = '✅ Страница загружена';
    // Даем React еще немного времени чтобы точно отрендерить баланс
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Проверяем авторизацию
async function checkAuthorization() {
  authCheckMsg.classList.remove('hidden');
  
  try {
    // Ищем вкладку Столото
    const tabs = await chrome.tabs.query({ url: 'https://www.stoloto.ru/ruslotto/game*' });
    
    if (tabs.length === 0) {
      authCheckMsg.textContent = '⚠️ Откройте страницу Столото';
      authCheckMsg.style.color = 'orange';
      document.querySelector('#ticketsToBuy').closest('.field').style.display = 'none';
      ticketsToBuyInput.value = '0';
      return;
    }
    
    const tab = tabs[0];
    console.log('📋 Вкладка Столото:', tab.id);
    
    const response = await chromeAdapter.sendMessageToTab(tab.id, MESSAGE_TYPES.GET_USER_DATA, {});
    console.log('📨 Ответ от content:', response);
    
    if (response.success) {
      const userData = response.data;
      console.log('👤 UserData:', userData);
      
      if (userData.isAuthorized) {
        userBalance = userData.balance; // Сохраняем баланс
        authCheckMsg.textContent = `✅ Авторизован. Баланс: ${userData.balance}₽`;
        
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
        authCheckMsg.textContent = '❌ Не авторизован. Войдите на сайте.';
        authCheckMsg.style.color = 'red';
        // Скрываем поле покупки
        document.querySelector('#ticketsToBuy').closest('.field').style.display = 'none';
        ticketsToBuyInput.value = '0';
      }
    }
  } catch (error) {
    console.error('❌ Ошибка проверки авторизации:', error);
    authCheckMsg.textContent = '⚠️ Ошибка проверки авторизации';
    // Скрываем поле покупки при ошибке
    document.querySelector('#ticketsToBuy').closest('.field').style.display = 'none';
    ticketsToBuyInput.value = '0';
  }
}

// Показать форму поиска
function showSearchForm() {
  setTimeout(() => {
    loadingStatus.classList.add('hidden');
    searchForm.classList.remove('hidden');
  }, 1000);
}



// Запускаем инициализацию
init();

console.log('✅ Sidepanel загружен');
