/**
 * Background Service Worker - оркестратор расширения
 * Управляет сеансами поиска, координирует работу между sidepanel и content
 */

import { ChromeAdapter } from './adapters/ChromeAdapter.js';
import { SearchTickets } from './usecases/SearchTickets.js';
import { PurchaseTickets } from './usecases/PurchaseTickets.js';
import { OpenWorkspace } from './usecases/OpenWorkspace.js';
import { MESSAGE_TYPES } from './shared/messaging.js';
import { logError } from './shared/errors.js';

const chromeAdapter = new ChromeAdapter();

// Активные сеансы поиска (Map: tabId -> searchSession)
const activeSessions = new Map();

// Готовые вкладки (Set: tabId)
const readyTabs = new Set();

// Запланированные перезагрузки (Map: tabId -> timeoutId)
const scheduledReloads = new Map();

// Вкладки созданные расширением (Set: tabId)
let ourTabs = new Set();

// Состояние поиска для каждой вкладки (Map: tabId -> searchState)
// searchState: { status: 'running'|'completed'|'stopped'|'error', ticketsChecked: number, message: string, tickets: [] }
const searchStates = new Map();

// Загрузить ourTabs из storage при старте
async function loadOurTabs() {
  try {
    const data = await chromeAdapter.getLocal('ourTabs');
    if (data) {
      ourTabs = new Set(data);
      console.log('📂 Загружено ourTabs:', ourTabs.size);
    } else {
      console.log('📂 ourTabs пуст (первый запуск)');
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки ourTabs:', error);
  }
}

// Сохранить ourTabs в storage
async function saveOurTabs() {
  await chromeAdapter.saveLocal('ourTabs', Array.from(ourTabs));
}

// Загружаем при старте
loadOurTabs();

// Настраиваем sidepanel чтобы открывался при клике на иконку
chrome.runtime.onInstalled.addListener(async (details) => {
  // Настраиваем sidepanel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => console.log('✅ Sidepanel настроен на открытие при клике'))
    .catch(err => console.error('❌ Ошибка настройки sidepanel:', err));
  
  // Очищаем ourTabs при установке или обновлении
  if (details.reason === 'install' || details.reason === 'update') {
    ourTabs.clear();
    await saveOurTabs();
    console.log('🗑️ ourTabs очищен при', details.reason);
  }
});

// Слушаем сообщения
chromeAdapter.onMessage(async (message, sender, sendResponse) => {
  try {
    const result = await handleMessage(message, sender);
    sendResponse({ success: true, ...result });
  } catch (error) {
    logError(error, 'Background');
    sendResponse({ success: false, error: error.message });
  }
});

/**
 * Обработка сообщений
 */
async function handleMessage(message, sender) {
  const { type, data } = message;

  switch (type) {
    case MESSAGE_TYPES.PAGE_READY:
      // Content script готов
      const tabId = sender.tab?.id;
      if (tabId) {
        readyTabs.add(tabId);
        console.log(`✅ Вкладка ${tabId} готова к работе`);
        
        // Проверяем есть ли активная сессия - если есть, значит PurchaseTickets сам перезагрузил
        const existingSession = activeSessions.get(tabId);
        if (existingSession) {
          console.log('✅ Активная сессия найдена - PurchaseTickets продолжит работу сам');
          // НЕ делаем ничего - PurchaseTickets ждёт в своём цикле и продолжит
        } else {
          // Проверяем есть ли сохраненное состояние покупки (ручная перезагрузка?)
          const purchaseState = await chromeAdapter.getLocal('purchaseState');
          
          if (purchaseState && purchaseState.tabId === tabId) {
            console.log('⚠️ Найдено состояние покупки, но сессия не активна - это ручная перезагрузка');
            
            // Сохраняем результат с ошибкой
            const errorState = {
              status: 'error',
              ticketsChecked: 0,
              message: 'Покупка прервана: страница была перезагружена вручную',
              tickets: [],
              criteria: purchaseState.criteria
            };
            searchStates.set(tabId, errorState);
            await chromeAdapter.saveLocal('lastSearchState', errorState);
            
            // Очищаем состояние покупки
            await chromeAdapter.saveLocal('purchaseState', null);
            
            // Уведомляем sidepanel
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.ERROR,
              data: { error: 'Покупка прервана: страница была перезагружена вручную' }
            }, () => {
              if (chrome.runtime.lastError) {
                console.log('⚠️ Ошибка отправки:', chrome.runtime.lastError.message);
              }
            });
          }
        }
      }
      break;

    case MESSAGE_TYPES.SIDEPANEL_OPENED:
      // Sidepanel открылся - выполняем логику
      console.log('📂 Sidepanel открыт, выполняем OpenWorkspace');
      const openWorkspace = new OpenWorkspace(chromeAdapter, ourTabs);
      const newTabId = await openWorkspace.execute();
      
      // Запоминаем что эту вкладку создали мы
      ourTabs.add(newTabId);
      await saveOurTabs();
      console.log('📝 Вкладка добавлена в ourTabs:', newTabId, 'Всего наших:', ourTabs.size);
      break;

    case MESSAGE_TYPES.START_SEARCH:
      await startSearch(data);
      break;

    case MESSAGE_TYPES.STOP_SEARCH:
      stopSearch(data.tabId);
      break;
    
    case MESSAGE_TYPES.SEARCH_PROGRESS:
      // Обновляем состояние при прогрессе
      const currentState = searchStates.get(sender.tab?.id || data.tabId);
      if (currentState) {
        currentState.ticketsChecked = data.checked;
        searchStates.set(sender.tab?.id || data.tabId, currentState);
      }
      break;

    case MESSAGE_TYPES.CHECK_SEARCH_STATUS:
      // Проверяем есть ли активный поиск для этой вкладки
      const state = searchStates.get(data.tabId);
      return { 
        isSearching: activeSessions.has(data.tabId),
        searchState: state
      };
    
    case MESSAGE_TYPES.SCHEDULE_RELOAD:
      // Планируем перезагрузку через указанное время
      scheduleReload(data.tabId, data.delay);
      break;

    default:
      console.log('Неизвестное сообщение:', type);
  }
}

/**
 * Запустить поиск
 */
async function startSearch(data) {
  console.log('🚀 startSearch в background, данные:', data);
  
  const { criteria } = data;

  // 1. Подготавливаем вкладку (закрываем чужие, создаем если нет нашей)
  console.log('🔍 Подготовка вкладки для поиска');
  const openWorkspace = new OpenWorkspace(chromeAdapter, ourTabs);
  const actualTabId = await openWorkspace.execute();
  
  console.log('✅ Вкладка подготовлена:', actualTabId);
  
  ourTabs.add(actualTabId);
  await saveOurTabs();

  // 2. Проверяем не запущен ли уже поиск на этой вкладке
  if (activeSessions.has(actualTabId)) {
    console.log('⚠️ Поиск уже запущен на вкладке', actualTabId);
    await chromeAdapter.sendMessage(MESSAGE_TYPES.ERROR, { 
      error: 'Поиск уже запущен. Дождитесь завершения или остановите текущий поиск.' 
    }).catch(() => {
      console.log('⚠️ Не удалось отправить ERROR (sidepanel закрыт?)');
    });
    return;
  }

  // 3. Запускаем поиск
  console.log('🔍 Запускаем executeSearch');
  await executeSearch(actualTabId, criteria);
}

/**
 * Выполнить поиск на готовой вкладке
 */
async function executeSearch(tabId, criteria) {
  console.log('🎯 executeSearch начат для вкладки:', tabId);
  console.log('📝 Критерии:', criteria);
  
  let skipCleanup = false;
  
  // Инициализируем состояние поиска
  searchStates.set(tabId, {
    status: 'running',
    ticketsChecked: 0,
    message: 'Поиск запущен...',
    tickets: [],
    criteria: criteria // Сохраняем критерии
  });
  
  // Создаем session объект
  const session = {
    criteria: criteria,
    isRunning: true,
    tabId: tabId
  };
  
  // Создаем SearchTickets с ссылкой на session
  const searchTickets = new SearchTickets(chromeAdapter, tabId, session);
  
  // Сохраняем session с useCase
  session.useCase = searchTickets;
  activeSessions.set(tabId, session);

  try {
    let result;
    
    // Если указано количество билетов для покупки - используем PurchaseTickets
    if (criteria.ticketsToBuy > 0) {
      console.log('🛒 Запускаем режим автопокупки');
      const purchaseTickets = new PurchaseTickets(chromeAdapter, tabId, session);
      result = await purchaseTickets.execute(criteria, criteria.ticketsToBuy);
    } else {
      console.log('🔍 Вызываем searchTickets.execute()');
      result = await searchTickets.execute(criteria);
    }
    
    console.log('📥 Результат:', result);
    
    // Если ждём перезагрузки - НЕ удаляем сессию, background продолжит через PAGE_READY
    if (result.waitingForReload) {
      console.log('⏳ Ждём запланированной перезагрузки, затем продолжим через PAGE_READY');
      console.log('📌 Сессия остаётся активной, keep-alive продолжает работать');
      skipCleanup = true;
      return;
    }
    
    if (result.stopped) {
      // Поиск был остановлен пользователем
      console.log('⏸️ Поиск остановлен пользователем');
      const stoppedState = {
        status: 'stopped',
        ticketsChecked: result.ticketsChecked || 0,
        message: 'Поиск остановлен пользователем',
        tickets: [],
        criteria: criteria
      };
      searchStates.set(tabId, stoppedState);
      await chromeAdapter.saveLocal('lastSearchState', stoppedState);
      
      chromeAdapter.sendMessage(MESSAGE_TYPES.SEARCH_STOPPED, {}).catch(() => {
        console.log('⚠️ Не удалось отправить SEARCH_STOPPED (sidepanel закрыт?)');
      });
    } else if (result.found) {
      // Найдены билеты
      console.log('✅ Найдено билетов:', result.tickets.length);
      const completedState = {
        status: 'completed',
        ticketsChecked: result.ticketsChecked || 0,
        message: `Найдено билетов: ${result.tickets.length}`,
        tickets: result.tickets,
        criteria: criteria
      };
      searchStates.set(tabId, completedState);
      await chromeAdapter.saveLocal('lastSearchState', completedState);
      
      chromeAdapter.sendMessage(MESSAGE_TYPES.TICKET_FOUND, { 
        tickets: result.tickets 
      }).catch(() => {
        console.log('⚠️ Не удалось отправить TICKET_FOUND (sidepanel закрыт?)');
      });
    }
  } catch (error) {
    console.error('❌ Ошибка в executeSearch:', error);
    logError(error, 'Search');
    
    // Если ошибка связи и есть запланированная перезагрузка - это нормально, игнорируем
    if (scheduledReloads.has(tabId) && 
        (error.message.includes('Receiving end does not exist') ||
         error.message.includes('Could not establish connection'))) {
      console.log('⚠️ Ошибка связи, но перезагрузка запланирована - игнорируем');
      skipCleanup = true;
      return;
    }
    
    // Сохраняем ошибку
    const state = searchStates.get(tabId) || { ticketsChecked: 0 };
    const errorState = {
      status: 'error',
      ticketsChecked: error.ticketsChecked || state.ticketsChecked || 0,
      message: error.message,
      tickets: [],
      criteria: criteria
    };
    searchStates.set(tabId, errorState);
    await chromeAdapter.saveLocal('lastSearchState', errorState);
    
    // Отправляем ошибку в sidepanel (игнорируем только если sidepanel закрыт)
    if (!error.message.includes('message channel closed') && 
        !error.message.includes('closed before a response was received')) {
      
      let errorMessage = error.message;
      
      // Если ошибка связи - значит пользователь ушел со страницы
      if (error.message.includes('Receiving end does not exist')) {
        errorMessage = 'Поиск прерван: пользователь покинул страницу';
      }
      
      await chromeAdapter.sendMessage(MESSAGE_TYPES.ERROR, { 
        error: errorMessage
      }).catch(() => {
        console.log('⚠️ Не удалось отправить ERROR (sidepanel закрыт?)');
      });
    } else {
      console.log('⚠️ Ошибка связи с background, игнорируем');
    }
  } finally {
    if (!skipCleanup) {
      activeSessions.delete(tabId);
      console.log('🏁 executeSearch завершен');
    } else {
      console.log('🔄 Пропускаем cleanup - ждём продолжения после перезагрузки');
    }
  }
}

/**
 * Остановить поиск
 */
function stopSearch(tabId) {
  console.log('⏸️ stopSearch вызван для вкладки:', tabId);
  console.log('📋 Активные сессии:', Array.from(activeSessions.keys()));
  
  const session = activeSessions.get(tabId);
  if (session) {
    console.log('✅ Сессия найдена, устанавливаем isRunning = false');
    session.isRunning = false;
    // НЕ удаляем сессию сразу - она удалится в finally блоке executeSearch
    console.log('⏸️ Поиск остановлен для вкладки', tabId);
  } else {
    console.log('⚠️ Сессия не найдена для вкладки', tabId);
  }
  
  // Отменяем запланированную перезагрузку если есть
  cancelScheduledReload(tabId);
}

/**
 * Запланировать перезагрузку страницы
 */
function scheduleReload(tabId, delay) {
  console.log(`📅 Планируем перезагрузку вкладки ${tabId} через ${delay}ms`);
  
  // Отменяем предыдущую если была
  cancelScheduledReload(tabId);
  
  const timeoutId = setTimeout(async () => {
    console.log(`🔄 Выполняем запланированную перезагрузку вкладки ${tabId}`);
    
    try {
      await new Promise((resolve, reject) => {
        chrome.tabs.reload(tabId, {}, () => {
          if (chrome.runtime.lastError) {
            console.error('❌ Ошибка при перезагрузке:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('✅ Перезагрузка выполнена успешно');
            resolve();
          }
        });
      });
      
      scheduledReloads.delete(tabId);
    } catch (error) {
      console.error('❌ Ошибка при выполнении перезагрузки:', error);
      scheduledReloads.delete(tabId);
    }
  }, delay);
  
  scheduledReloads.set(tabId, timeoutId);
  console.log(`✅ Перезагрузка запланирована, timeoutId:`, timeoutId);
}

/**
 * Отменить запланированную перезагрузку
 */
function cancelScheduledReload(tabId) {
  const timeoutId = scheduledReloads.get(tabId);
  if (timeoutId) {
    console.log(`❌ Отменяем запланированную перезагрузку для вкладки ${tabId}`);
    clearTimeout(timeoutId);
    scheduledReloads.delete(tabId);
  }
}



// Отслеживаем навигацию на наших вкладках
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
  // Проверяем только наши вкладки и только когда URL изменился
  if (!ourTabs.has(tabId) || !changeInfo.url) return;
  
  const url = changeInfo.url;
  const isSearchPage = url.includes('stoloto.ru/ruslotto/game');
  const isLoginPage = url.includes('stoloto.ru/login') || url.includes('stoloto.ru/auth');
  
  // Если пользователь ушел с нужных страниц
  if (!isSearchPage && !isLoginPage) {
    console.log('🚫 Пользователь ушел с нужной страницы:', url);
    
    // Если был активный поиск - сохраняем ошибку
    const session = activeSessions.get(tabId);
    if (session) {
      console.log('⏸️ Был активный поиск, сохраняем ошибку');
      session.isRunning = false;
      
      const state = searchStates.get(tabId) || { ticketsChecked: 0 };
      const errorState = {
        status: 'error',
        ticketsChecked: state.ticketsChecked,
        message: 'Поиск прерван: пользователь покинул страницу',
        tickets: [],
        criteria: session.criteria
      };
      searchStates.set(tabId, errorState);
      await chromeAdapter.saveLocal('lastSearchState', errorState);
      
      // Уведомляем sidepanel
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.ERROR,
        data: { error: 'Поиск прерван: пользователь покинул страницу' }
      }, () => {
        if (chrome.runtime.lastError) {
          console.log('⚠️ Ошибка отправки:', chrome.runtime.lastError.message);
        }
      });
      
      activeSessions.delete(tabId);
    }
    
    // Закрываем sidepanel
    await chromeAdapter.sendMessage(MESSAGE_TYPES.CLOSE_SIDEPANEL, {}).catch(() => {});
    
    // Удаляем вкладку из памяти
    ourTabs.delete(tabId);
    await saveOurTabs();
    console.log('🗑️ Вкладка удалена из ourTabs:', tabId);
    
    readyTabs.delete(tabId);
  }
});

// Очистка при закрытии вкладки
chrome.tabs.onRemoved.addListener(async (tabId) => {
  // Если это наша вкладка - уведомляем sidepanel
  if (ourTabs.has(tabId)) {
    console.log('🚪 Наша вкладка закрыта:', tabId);
    await chromeAdapter.sendMessage(MESSAGE_TYPES.OUR_TAB_CLOSED, { tabId });
  }
  
  // Отменяем запланированную перезагрузку
  cancelScheduledReload(tabId);
  
  activeSessions.delete(tabId);
  readyTabs.delete(tabId);
  ourTabs.delete(tabId);
  await saveOurTabs();
  console.log('🗑️ Вкладка удалена из ourTabs:', tabId);
});

// Sidepanel открывается автоматически при клике на иконку
// Логика выполняется когда sidepanel отправляет сообщение SIDEPANEL_OPENED

console.log('✅ Background Service Worker загружен');
