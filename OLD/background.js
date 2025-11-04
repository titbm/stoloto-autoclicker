/**
 * Background Service Worker
 * Управляет состоянием поиска для всех вкладок
 */

// ============================================================================
// ХРАНИЛИЩА
// ============================================================================

// Активные сеансы поиска (в памяти, быстрый доступ)
const activeSessions = new Map();

// ============================================================================
// РАБОТА С ПОЛЬЗОВАТЕЛЬСКИМИ НАСТРОЙКАМИ (chrome.storage.sync)
// ============================================================================

/**
 * Загрузка последних введенных данных пользователя
 */
async function loadUserPreferences() {
  const { userPreferences } = await chrome.storage.sync.get('userPreferences');
  return userPreferences || {
    lastSearchNumbers: [],
    lastExcludeNumbers: [],
    lastSearchMode: 'half',
    lastTicketsToBuy: 1
  };
}

/**
 * Сохранение настроек пользователя для следующего использования
 */
async function saveUserPreferences(prefs) {
  await chrome.storage.sync.set({ userPreferences: prefs });
  console.log('💾 Настройки пользователя сохранены:', prefs);
}

// ============================================================================
// РАБОТА С СОСТОЯНИЕМ ПОКУПКИ (chrome.storage.session)
// ============================================================================

/**
 * Сохранение состояния покупки (переживает перезагрузку страницы)
 */
async function savePurchaseState(tabId, state) {
  const key = `purchase_${tabId}`;
  
  // Проверяем поддержку session storage
  if ('session' in chrome.storage) {
    await chrome.storage.session.set({ [key]: state });
  } else {
    // Fallback на local storage
    await chrome.storage.local.set({ [key]: state });
  }
  
  console.log(`💾 Состояние покупки сохранено для вкладки ${tabId}:`, state);
}

/**
 * Загрузка состояния покупки
 */
async function loadPurchaseState(tabId) {
  const key = `purchase_${tabId}`;
  
  let data;
  if ('session' in chrome.storage) {
    data = await chrome.storage.session.get(key);
  } else {
    data = await chrome.storage.local.get(key);
  }
  
  return data[key];
}

/**
 * Удаление состояния покупки
 */
async function clearPurchaseState(tabId) {
  const key = `purchase_${tabId}`;
  
  if ('session' in chrome.storage) {
    await chrome.storage.session.remove(key);
  } else {
    await chrome.storage.local.remove(key);
  }
  
  console.log(`🗑️ Состояние покупки удалено для вкладки ${tabId}`);
}

// ============================================================================
// УПРАВЛЕНИЕ СЕАНСАМИ ПОИСКА
// ============================================================================

/**
 * Создание нового сеанса поиска
 */
function createSession(tabId, params) {
  const session = {
    tabId,
    isSearching: true,
    numbers: params.numbers,
    excludeNumbers: params.excludeNumbers || [],
    mode: params.mode,
    isPurchaseMode: params.isPurchaseMode || false,
    totalTicketsToBuy: params.ticketsToBuy || 0,
    ticketsPurchased: 0,
    ticketsChecked: 0,
    startTime: Date.now()
  };
  
  activeSessions.set(tabId, session);
  
  // Сохраняем настройки пользователя для следующего раза
  saveUserPreferences({
    lastSearchNumbers: params.numbers,
    lastExcludeNumbers: params.excludeNumbers || [],
    lastSearchMode: params.mode,
    lastTicketsToBuy: params.ticketsToBuy || 1
  });
  
  // Если режим покупки, сохраняем в session storage
  if (session.isPurchaseMode) {
    savePurchaseState(tabId, session);
  }
  
  console.log(`🚀 Создан сеанс поиска для вкладки ${tabId}:`, session);
  return session;
}

/**
 * Получение сеанса по tabId
 */
function getSession(tabId) {
  return activeSessions.get(tabId);
}

/**
 * Обновление сеанса
 */
function updateSession(tabId, updates) {
  const session = activeSessions.get(tabId);
  if (!session) return;
  
  Object.assign(session, updates);
  
  // Если режим покупки, сохраняем изменения
  if (session.isPurchaseMode) {
    savePurchaseState(tabId, session);
  }
  
  console.log(`📝 Обновлен сеанс для вкладки ${tabId}:`, updates);
}

/**
 * Удаление сеанса
 */
async function deleteSession(tabId) {
  const session = activeSessions.get(tabId);
  
  if (session?.isPurchaseMode) {
    await clearPurchaseState(tabId);
  }
  
  activeSessions.delete(tabId);
  console.log(`🗑️ Удален сеанс для вкладки ${tabId}`);
}

/**
 * Остановка поиска
 */
async function stopSearch(tabId) {
  const session = getSession(tabId);
  if (!session) {
    console.log(`⚠️ Сеанс для вкладки ${tabId} не найден`);
    return;
  }
  
  updateSession(tabId, { isSearching: false });
  
  // Очищаем выбор на странице
  try {
    await sendCommand(tabId, { action: 'clearSelection' });
  } catch (error) {
    console.error('Ошибка при очистке выбора:', error);
  }
  
  await deleteSession(tabId);
  
  console.log(`⏹️ Поиск остановлен для вкладки ${tabId}`);
}

// ============================================================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================================

/**
 * Очистка при закрытии вкладки
 */
chrome.tabs.onRemoved.addListener(async (tabId) => {
  console.log(`🚪 Вкладка ${tabId} закрыта`);
  await deleteSession(tabId);
});

/**
 * Обработка клика по иконке расширения
 */
chrome.action.onClicked.addListener(async (tab) => {
  const workPageUrl = 'https://www.stoloto.ru/ruslotto/game?viewType=tickets';
  
  if (tab.url && tab.url.startsWith(workPageUrl)) {
    await chrome.action.setPopup({ popup: 'popup.html' });
    await chrome.action.openPopup();
  } else {
    await chrome.tabs.create({ url: workPageUrl });
  }
  
  await chrome.action.setPopup({ popup: '' });
});

/**
 * Обработка сообщений от popup и content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Получено сообщение:', request);
  
  // Определяем tabId
  const tabId = sender.tab?.id || request.tabId;
  
  // Маршрутизация сообщений
  switch (request.action) {
    case 'pageReady':
      console.log(`📄 Страница готова в вкладке ${tabId}`);
      sendResponse({ status: 'success' });
      break;
      
    case 'getUserPreferences':
      handleGetUserPreferences(sendResponse);
      return true;
      
    case 'startSearch':
      if (!tabId) {
        sendResponse({ status: 'error', message: 'No tabId' });
        return;
      }
      handleStartSearch(tabId, request, sendResponse);
      return true;
      
    case 'stopSearch':
      if (!tabId) {
        sendResponse({ status: 'error', message: 'No tabId' });
        return;
      }
      handleStopSearch(tabId, sendResponse);
      return true;
      
    case 'getSessionState':
      if (!tabId) {
        sendResponse({ status: 'error', message: 'No tabId' });
        return;
      }
      handleGetSessionState(tabId, sendResponse);
      return true;
      
    default:
      console.warn('⚠️ Неизвестное действие:', request.action);
      sendResponse({ status: 'error', message: 'Unknown action' });
  }
});

// ============================================================================
// ОБРАБОТЧИКИ ДЕЙСТВИЙ
// ============================================================================

/**
 * Получение настроек пользователя
 */
async function handleGetUserPreferences(sendResponse) {
  const prefs = await loadUserPreferences();
  sendResponse({ status: 'success', preferences: prefs });
}

/**
 * Запуск поиска
 */
async function handleStartSearch(tabId, request, sendResponse) {
  try {
    // Сначала останавливаем предыдущий поиск если он был
    const existingSession = getSession(tabId);
    if (existingSession && existingSession.isSearching) {
      console.log('⚠️ Обнаружен активный сеанс, останавливаем его');
      await stopSearch(tabId);
      // Даем время на очистку
      await new Promise(resolve => setTimeout(resolve, 500));
    } else if (existingSession) {
      // Сеанс есть но не активен, просто удаляем
      console.log('⚠️ Обнаружен неактивный сеанс, удаляем его');
      await deleteSession(tabId);
    }
    
    const session = createSession(tabId, {
      numbers: request.numbers,
      excludeNumbers: request.excludeNumbers,
      mode: request.mode,
      isPurchaseMode: request.isPurchaseMode,
      ticketsToBuy: request.ticketsToBuy
    });
    
    sendResponse({ status: 'success', session });
    
    // Запускаем процесс поиска
    startSearchProcess(tabId);
    
  } catch (error) {
    console.error('❌ Ошибка при запуске поиска:', error);
    sendResponse({ status: 'error', message: error.message });
  }
}

/**
 * Процесс поиска - пинг-понг с content script
 */
async function startSearchProcess(tabId) {
  const session = getSession(tabId);
  if (!session) return;
  
  console.log(`🔍 Начинаем процесс поиска для вкладки ${tabId}`);
  
  try {
    // Шаг 1: Очищаем предыдущий выбор
    await sendCommand(tabId, { action: 'clearSelection' });
    
    // Шаг 2: Открываем модальное окно
    const modalResult = await sendCommand(tabId, { action: 'openModal' });
    if (!modalResult.success) {
      console.error('❌ Не удалось открыть модальное окно');
      return;
    }
    
    // Шаг 3: Выбираем числа
    const selectResult = await sendCommand(tabId, { 
      action: 'selectNumbers',
      numbers: session.numbers
    });
    if (!selectResult.success) {
      console.error('❌ Не удалось выбрать числа');
      return;
    }
    
    // Шаг 4: Показываем билеты
    const showResult = await sendCommand(tabId, { action: 'showTickets' });
    if (!showResult.success) {
      console.error('❌ Не удалось показать билеты');
      return;
    }
    
    // Шаг 5: Начинаем поиск подходящих билетов
    await searchTickets(tabId);
    
  } catch (error) {
    console.error('❌ Ошибка в процессе поиска:', error);
  }
}

/**
 * Поиск подходящих билетов
 */
async function searchTickets(tabId) {
  const session = getSession(tabId);
  if (!session || !session.isSearching) return;
  
  console.log(`🎫 Сканируем билеты на странице (вкладка ${tabId})`);
  
  // Получаем билеты со страницы
  const scanResult = await sendCommand(tabId, { action: 'scanPage' });
  if (!scanResult.success) {
    console.error('❌ Не удалось отсканировать страницу');
    return;
  }
  
  const tickets = scanResult.tickets;
  console.log(`Найдено ${tickets.length} билетов на странице`);
  
  // Анализируем билеты
  const suitableTickets = [];
  for (const ticket of tickets) {
    session.ticketsChecked++;
    
    if (analyzeTicket(ticket, session)) {
      console.log(`✅ Подходящий билет: ${ticket.id}`);
      suitableTickets.push(ticket);
      
      // Если режим покупки и достигли лимита, останавливаемся
      if (session.isPurchaseMode && 
          suitableTickets.length + session.ticketsPurchased >= session.totalTicketsToBuy) {
        break;
      }
    }
  }
  
  // Обновляем сессию
  updateSession(tabId, { ticketsChecked: session.ticketsChecked });
  
  if (suitableTickets.length > 0) {
    // Нашли подходящие билеты!
    await handleFoundTickets(tabId, suitableTickets);
  } else {
    // Не нашли, пробуем следующую страницу
    await loadNextPageAndContinue(tabId);
  }
}

/**
 * Анализ билета
 */
function analyzeTicket(ticket, session) {
  const { numbers, excludeNumbers, mode } = session;
  const ticketNumbers = ticket.numbers;
  
  if (ticketNumbers.length !== 30) return false;
  
  // Проверяем исключаемые числа
  if (excludeNumbers.length > 0) {
    const hasExcluded = excludeNumbers.some(num => ticketNumbers.includes(parseInt(num)));
    if (hasExcluded) return false;
  }
  
  // Разделяем на строки (6 строк по 5 чисел)
  const rows = [];
  for (let i = 0; i < 6; i++) {
    rows.push(ticketNumbers.slice(i * 5, (i + 1) * 5));
  }
  
  switch (mode) {
    case 'row':
      return rows.some(row => numbers.every(num => row.includes(parseInt(num))));
      
    case 'half':
      const firstHalf = rows.slice(0, 3).flat();
      const secondHalf = rows.slice(3).flat();
      return numbers.every(num => firstHalf.includes(parseInt(num))) ||
             numbers.every(num => secondHalf.includes(parseInt(num)));
      
    case 'anywhere':
      return numbers.every(num => ticketNumbers.includes(parseInt(num)));
      
    default:
      return false;
  }
}

/**
 * Обработка найденных билетов
 */
async function handleFoundTickets(tabId, tickets) {
  const session = getSession(tabId);
  console.log(`🎉 Найдено ${tickets.length} подходящих билетов!`);
  
  // Выбираем билеты
  const ticketIds = tickets.map(t => t.id);
  await sendCommand(tabId, { 
    action: 'selectTickets',
    ticketIds
  });
  
  if (session.isPurchaseMode) {
    // Режим покупки - проверяем кнопку оплаты
    const paymentCheck = await sendCommand(tabId, { action: 'checkPayment' });
    
    if (paymentCheck.hasPayment) {
      console.log('💳 Оплачиваем билеты...');
      await sendCommand(tabId, { action: 'clickPayment' });
      
      session.ticketsPurchased += tickets.length;
      updateSession(tabId, { ticketsPurchased: session.ticketsPurchased });
      
      if (session.ticketsPurchased >= session.totalTicketsToBuy) {
        console.log('✅ Покупка завершена!');
        await stopSearch(tabId);
      } else {
        // Нужно купить еще, перезагружаем страницу
        console.log(`⏳ Куплено ${session.ticketsPurchased}/${session.totalTicketsToBuy}, продолжаем...`);
        await sendCommand(tabId, { action: 'reload' });
      }
    }
  } else {
    // Обычный режим - просто останавливаемся
    console.log('✅ Поиск завершен!');
    await stopSearch(tabId);
  }
}

/**
 * Загрузка следующей страницы
 */
async function loadNextPageAndContinue(tabId) {
  const session = getSession(tabId);
  if (!session || !session.isSearching) return;
  
  console.log('⏭️ Загружаем следующую страницу...');
  
  const result = await sendCommand(tabId, { action: 'loadNextPage' });
  
  if (result.success) {
    // Продолжаем поиск
    setTimeout(() => searchTickets(tabId), 2000);
  } else {
    console.log('❌ Больше нет билетов');
    await stopSearch(tabId);
  }
}

/**
 * Отправка команды в content script
 */
function sendCommand(tabId, command) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, command, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Ошибка отправки команды:', chrome.runtime.lastError);
        resolve({ success: false });
      } else {
        resolve(response || { success: false });
      }
    });
  });
}

/**
 * Остановка поиска
 */
async function handleStopSearch(tabId, sendResponse) {
  try {
    await stopSearch(tabId);
    sendResponse({ status: 'success' });
  } catch (error) {
    console.error('❌ Ошибка при остановке поиска:', error);
    sendResponse({ status: 'error', message: error.message });
  }
}

/**
 * Получение состояния сеанса
 */
function handleGetSessionState(tabId, sendResponse) {
  const session = getSession(tabId);
  sendResponse({ 
    status: 'success', 
    session: session || null 
  });
}

console.log('🎯 Background service worker запущен');
