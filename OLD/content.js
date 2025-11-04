/**
 * Content Script - Тонкий адаптер между background и DOM
 * Только выполняет команды, вся логика в background
 */

console.log('🎯 Столото Автокликер: content script загружен');

// Ждем загрузки DOM adapter
function waitForDOMAdapter() {
    return new Promise((resolve) => {
        if (window.StolotoDOMAdapter) {
            resolve();
        } else {
            const check = setInterval(() => {
                if (window.StolotoDOMAdapter) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        }
    });
}

// Инициализация
(async () => {
    await waitForDOMAdapter();
    
    const dom = new window.StolotoDOMAdapter();
    console.log('✅ DOM Adapter инициализирован');
    
    // Уведомляем background что страница готова
    chrome.runtime.sendMessage({ 
        action: 'pageReady',
        isStolotoPage: window.location.hostname.includes('stoloto.ru')
    });
    
    // Слушаем команды от background
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        console.log('📨 Получена команда:', msg.action);
        
        handleCommand(msg, sendResponse);
        return true; // Асинхронный ответ
    });
    
    async function handleCommand(msg, sendResponse) {
        try {
            switch (msg.action) {
                case 'scanPage':
                    const tickets = dom.extractTickets();
                    sendResponse({ success: true, tickets });
                    break;
                    
                case 'selectTickets':
                    for (const ticketId of msg.ticketIds) {
                        dom.clickTicket(ticketId);
                        await dom._wait(1000);
                    }
                    sendResponse({ success: true });
                    break;
                    
                case 'openModal':
                    const opened = await dom.openNumberModal();
                    sendResponse({ success: opened });
                    break;
                    
                case 'selectNumbers':
                    const selected = await dom.selectNumbers(msg.numbers);
                    sendResponse({ success: selected });
                    break;
                    
                case 'showTickets':
                    const shown = await dom.showTickets();
                    sendResponse({ success: shown });
                    break;
                    
                case 'loadNextPage':
                    const loaded = await dom.loadNextPage();
                    sendResponse({ success: loaded });
                    break;
                    
                case 'checkPayment':
                    const hasPayment = dom.hasPaymentButton();
                    sendResponse({ success: true, hasPayment });
                    break;
                    
                case 'clickPayment':
                    const paid = await dom.clickPayment();
                    sendResponse({ success: paid });
                    break;
                    
                case 'checkAuth':
                    const isLoggedIn = dom.isUserLoggedIn();
                    sendResponse({ success: true, isLoggedIn });
                    break;
                    
                case 'checkBalance':
                    const balance = dom.getUserBalance();
                    const hasEnough = balance >= (msg.ticketsToBuy * 150);
                    sendResponse({ 
                        success: true, 
                        balance, 
                        hasEnoughFunds: hasEnough,
                        requiredAmount: msg.ticketsToBuy * 150
                    });
                    break;
                    
                case 'clearSelection':
                    await dom.clearSelection();
                    sendResponse({ success: true });
                    break;
                    
                case 'reload':
                    window.location.reload();
                    sendResponse({ success: true });
                    break;
                    
                default:
                    console.warn('⚠️ Неизвестная команда:', msg.action);
                    sendResponse({ success: false, error: 'Unknown command' });
            }
        } catch (error) {
            console.error('❌ Ошибка при выполнении команды:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    console.log('✅ Content script готов к работе');
})();
