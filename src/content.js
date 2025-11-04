/**
 * Content Script - работает на странице Столото
 * Получает команды от background и выполняет их
 * Без импортов - весь код инлайн для совместимости
 */

// Константы (копия из shared/constants.js)
const LIMITS = {
  MIN_NUMBER: 1,
  MAX_NUMBER: 90,
  NUMBERS_PER_TICKET: 30,
  ROWS_PER_TICKET: 6,
  NUMBERS_PER_ROW: 5
};

const TIMEOUTS = {
  PAGE_LOAD: 2000,
  CLICK_DELAY: 500
};

// Типы сообщений (копия из shared/messaging.js)
const MESSAGE_TYPES = {
  GET_TICKETS: 'get_tickets',
  GET_USER_DATA: 'get_user_data',
  CLICK_TICKET: 'click_ticket',
  NEXT_PAGE: 'next_page',
  HAS_NEXT_PAGE: 'has_next_page',
  OPEN_FILTER_MODAL: 'open_filter_modal',
  SELECT_NUMBERS: 'select_numbers',
  APPLY_FILTER: 'apply_filter',
  CLEAR_FILTER: 'clear_filter',
  CHECK_PAGE_READY: 'check_page_ready',
  RELOAD_PAGE: 'reload_page',
  CHECK_PAYMENT_BUTTONS: 'check_payment_buttons',
  CLICK_PAYMENT_BUTTON: 'click_payment_button'
};

// === Парсинг DOM (инлайн WebsiteAdapter) ===

function getTickets() {
  const ticketButtons = Array.from(document.querySelectorAll('button'))
    .filter(btn => btn.textContent.includes('Билет №'));

  if (ticketButtons.length === 0) {
    throw new Error('Билеты не найдены на странице');
  }

  return ticketButtons.map(btn => {
    const ticketId = btn.textContent.match(/Билет №(\d+)/)?.[1];
    const numbers = extractNumbers(btn);

    if (!ticketId || numbers.length !== LIMITS.NUMBERS_PER_TICKET) {
      throw new Error(`Некорректный билет: ID=${ticketId}, чисел=${numbers.length}`);
    }

    return { ticketId, numbers };
  });
}

function extractNumbers(ticketElement) {
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

function getUserData() {
  const isAuthorized = checkAuthorization();
  const balance = getBalance();
  const ticketPrice = 100; // Временно

  return { isAuthorized, balance, ticketPrice };
}

function checkAuthorization() {
  // Проверяем наличие cookie ga - он есть только когда авторизован
  const cookies = document.cookie.split(';').map(c => c.trim());
  const gaCookie = cookies.find(c => c.startsWith('ga='));
  
  const isAuthorized = !!gaCookie;
  
  console.log('🔐 Проверка авторизации:', {
    gaCookie: gaCookie ? gaCookie.substring(0, 20) + '...' : null,
    isAuthorized
  });
  
  return isAuthorized;
}

function getBalance() {
  // Ищем ссылку на кошелёк - она содержит баланс
  const walletLink = Array.from(document.querySelectorAll('a'))
    .find(a => a.href && a.href.includes('/private/wallet') && a.textContent.includes('₽'));
  
  if (walletLink) {
    const text = walletLink.textContent.replace(/\u00A0/g, ' ').trim();
    // Парсим число из текста типа "1 040 ₽"
    const match = text.match(/(\d+(?:\s?\d+)*)\s*₽/);
    if (match) {
      const balance = parseInt(match[1].replace(/\s/g, ''));
      if (!isNaN(balance) && balance >= 0) {
        console.log('💰 Найден баланс:', balance, 'в ссылке на кошелёк');
        return balance;
      }
    }
  }
  
  console.log('⚠️ Баланс не найден');
  return 0;
}

function clickTicket(ticketId) {
  const btn = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.includes(`Билет №${ticketId}`));

  if (!btn) {
    throw new Error(`Билет №${ticketId} не найден`);
  }

  btn.click();
}

async function nextPage() {
  const btn = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.trim() === 'Другие билеты');

  if (!btn) {
    throw new Error('Кнопка "Другие билеты" не найдена');
  }

  btn.click();
  await wait(TIMEOUTS.PAGE_LOAD);
}

function hasNextPage() {
  return Array.from(document.querySelectorAll('button'))
    .some(btn => btn.textContent.trim() === 'Другие билеты');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === Работа с фильтром ===

function checkPageReady() {
  // Проверяем есть ли кнопка "Выбрать числа"
  const btn = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.trim() === 'Выбрать числа');
  
  return { ready: !!btn };
}

async function reloadPage() {
  console.log('🔄 Перезагружаем страницу');
  window.location.reload();
  return { reloading: true };
}

async function openFilterModal() {
  // Ищем кнопку "Выбрать числа"
  const btn = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.trim() === 'Выбрать числа');
  
  if (!btn) {
    throw new Error('Кнопка "Выбрать числа" не найдена');
  }
  
  console.log('🖱️ Кликаем на кнопку "Выбрать числа"');
  btn.click();
  await wait(2000);
  
  // Проверяем что модальное окно открылось
  const numberButtons = document.querySelectorAll('dialog button, [data-test-id="number-list"] button');
  const hasNumbers = Array.from(numberButtons).some(btn => /^\d+$/.test(btn.textContent.trim()));
  
  if (!hasNumbers) {
    throw new Error('Модальное окно с числами не открылось');
  }
  
  console.log('✅ Модальное окно открыто');
  return { opened: true };
}

async function selectNumbers(numbers) {
  console.log('Выбираем числа:', numbers);
  
  for (const num of numbers) {
    const numberButtons = Array.from(document.querySelectorAll('dialog button, [data-test-id="number-list"] button'));
    const button = numberButtons.find(btn => {
      const text = btn.textContent.trim();
      return text === num.toString() && /^\d+$/.test(text);
    });
    
    if (!button) {
      throw new Error(`Кнопка для числа ${num} не найдена`);
    }
    
    console.log(`Кликаем на число ${num}`);
    button.click();
    await wait(800);
  }
  
  return { selected: true };
}

async function applyFilter() {
  const btn = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.trim() === 'Показать билеты');
  
  if (!btn) {
    throw new Error('Кнопка "Показать билеты" не найдена');
  }
  
  btn.click();
  await wait(2000); // Ждем загрузки отфильтрованных билетов
  
  return { applied: true };
}

async function clearFilter() {
  // Ищем кнопку "Сбросить" внутри модального окна
  const btn = Array.from(document.querySelectorAll('dialog button, [role="dialog"] button'))
    .find(btn => btn.textContent.trim() === 'Сбросить');
  
  if (btn) {
    console.log('🔄 Нажимаем кнопку "Сбросить" в модалке');
    btn.click();
    await wait(500);
    return { cleared: true };
  }
  
  console.log('⚠️ Кнопка "Сбросить" не найдена (возможно ничего не было выбрано)');
  return { cleared: false };
}

// === Обработка сообщений ===

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(result => sendResponse({ success: true, data: result }))
    .catch(error => {
      console.error('[Content Script]', error);
      sendResponse({ success: false, error: error.message });
    });
  
  return true; // Асинхронный ответ
});

async function handleMessage(message) {
  const { type, data } = message;
  
  console.log('📨 [Content Script] Получено сообщение:', type, data);

  switch (type) {
    case MESSAGE_TYPES.GET_TICKETS:
      return getTickets();

    case MESSAGE_TYPES.GET_USER_DATA:
      return getUserData();

    case MESSAGE_TYPES.CLICK_TICKET:
      clickTicket(data.ticketId);
      return { clicked: true };

    case MESSAGE_TYPES.NEXT_PAGE:
      await nextPage();
      return { loaded: true };

    case MESSAGE_TYPES.HAS_NEXT_PAGE:
      return { hasNext: hasNextPage() };

    case MESSAGE_TYPES.OPEN_FILTER_MODAL:
      return await openFilterModal();

    case MESSAGE_TYPES.SELECT_NUMBERS:
      return await selectNumbers(data.numbers);

    case MESSAGE_TYPES.APPLY_FILTER:
      return await applyFilter();

    case MESSAGE_TYPES.CLEAR_FILTER:
      return await clearFilter();

    case MESSAGE_TYPES.CHECK_PAGE_READY:
      return checkPageReady();

    case MESSAGE_TYPES.RELOAD_PAGE:
      return await reloadPage();

    case MESSAGE_TYPES.CHECK_PAYMENT_BUTTONS:
      return checkPaymentButtons();

    case MESSAGE_TYPES.CLICK_PAYMENT_BUTTON:
      return await clickPaymentButton();

    default:
      throw new Error(`Неизвестный тип сообщения: ${type}`);
  }
}

// === Работа с оплатой ===

function checkPaymentButtons() {
  const allButtons = Array.from(document.querySelectorAll('button'));
  
  // Ищем кнопку "Оплатить кошельком" (широкий экран)
  const walletButton = allButtons.find(btn => 
    btn.textContent.trim().includes('Оплатить кошельком')
  );
  
  // Ищем кнопку "Оплатить N билетов" (узкий экран)
  const payTicketsButton = allButtons.find(btn => 
    btn.textContent.trim().match(/Оплатить \d+ билет/)
  );
  
  // Ищем кнопку с QR кодом
  const qrButton = allButtons.find(btn => 
    btn.textContent.trim().includes('QR') || 
    btn.textContent.trim().includes('СБП')
  );
  
  return {
    walletPaymentAvailable: !!(walletButton || payTicketsButton),
    qrPaymentAvailable: !!qrButton
  };
}

async function clickPaymentButton() {
  let allButtons = Array.from(document.querySelectorAll('button'));
  
  // Сначала ищем кнопку "Оплатить кошельком" (широкий экран)
  let walletButton = allButtons.find(btn => 
    btn.textContent.trim().includes('Оплатить кошельком')
  );
  
  if (walletButton) {
    console.log('💳 Нажимаем кнопку "Оплатить кошельком" (широкий экран)');
    walletButton.click();
    console.log('✅ Кнопка нажата');
    return { clicked: true };
  }
  
  // Если не нашли - ищем кнопку "Оплатить N билетов" (узкий экран)
  const payTicketsButton = allButtons.find(btn => 
    btn.textContent.trim().match(/Оплатить \d+ билет/)
  );
  
  if (!payTicketsButton) {
    throw new Error('Кнопка оплаты не найдена');
  }
  
  console.log('💳 Нажимаем кнопку "Оплатить N билетов" (узкий экран)');
  payTicketsButton.click();
  
  // Ждём появления модалки
  console.log('⏳ Ждём появления модалки с кнопкой оплаты...');
  await wait(1000);
  
  // Ищем кнопку "Оплатить кошельком" в модалке
  allButtons = Array.from(document.querySelectorAll('button'));
  walletButton = allButtons.find(btn => 
    btn.textContent.trim().includes('Оплатить кошельком')
  );
  
  if (!walletButton) {
    throw new Error('Кнопка "Оплатить кошельком" не найдена в модалке');
  }
  
  console.log('💳 Нажимаем кнопку "Оплатить кошельком" в модалке');
  walletButton.click();
  
  console.log('✅ Кнопка нажата');
  return { clicked: true };
}

// Уведомляем background что страница готова
chrome.runtime.sendMessage({ 
  type: 'PAGE_READY',
  data: { url: window.location.href }
});

// Слушаем сообщения от content-main.js (MAIN world)
window.addEventListener('message', (event) => {
  if (event.source === window && event.data.type === 'STOLOTO_AUTH_CHANGED') {
    console.log('🔄 Получено сообщение об изменении авторизации');
    
    setTimeout(() => {
      const isAuthorized = checkAuthorization();
      console.log('🔄 Новый статус авторизации:', isAuthorized);
      
      chrome.runtime.sendMessage({
        type: 'AUTH_CHANGED',
        data: { isAuthorized }
      });
    }, 500);
  }
});

console.log('✅ Content Script загружен (ISOLATED world)');
