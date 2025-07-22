/**
 * State Module - Управление состоянием
 * Отвечает за хранение и управление состоянием поиска и покупки
 */

// Инициализация глобального состояния
window.stolotoState = {
    // Состояние поиска
    isSearching: false,
    searchMode: 'half', // Режим поиска по умолчанию
    ticketsChecked: 0, // Счетчик просмотренных билетов
    searchStartTime: null, // Время начала поиска

    // Состояние автоматической покупки
    isPurchaseMode: false, // Флаг режима покупки
    totalTicketsToBuy: 0, // Общее количество билетов для покупки
    ticketsPurchased: 0, // Количество купленных билетов
    purchaseSearchNumbers: [], // Числа для поиска в режиме покупки
    purchaseExcludeNumbers: [], // Исключаемые числа в режиме покупки
    purchaseSearchMode: 'half', // Режим поиска в режиме покупки
    purchaseTicketsChecked: 0, // Счетчик просмотренных билетов в режиме покупки
    purchaseStartTime: null // Время начала поиска в режиме покупки
};

// Сохранение состояния покупки
async function savePurchaseState() {
    const state = window.stolotoState;
    await chrome.storage.local.set({
        purchaseState: {
            isPurchaseMode: state.isPurchaseMode,
            totalTicketsToBuy: state.totalTicketsToBuy,
            ticketsPurchased: state.ticketsPurchased,
            purchaseSearchNumbers: state.purchaseSearchNumbers,
            purchaseExcludeNumbers: state.purchaseExcludeNumbers,
            purchaseSearchMode: state.purchaseSearchMode,
            purchaseTicketsChecked: state.purchaseTicketsChecked,
            purchaseStartTime: state.purchaseStartTime,
            timestamp: Date.now()
        }
    });
    console.log('Состояние покупки сохранено:', {
        ticketsPurchased: state.ticketsPurchased,
        totalTicketsToBuy: state.totalTicketsToBuy,
        purchaseSearchNumbers: state.purchaseSearchNumbers,
        purchaseTicketsChecked: state.purchaseTicketsChecked,
        purchaseStartTime: state.purchaseStartTime ? new Date(state.purchaseStartTime).toLocaleTimeString() : null
    });
}

// Загрузка состояния покупки
async function loadPurchaseState() {
    try {
        const data = await chrome.storage.local.get('purchaseState');
        if (data.purchaseState) {
            const state = window.stolotoState;
            const savedState = data.purchaseState;
            
            state.isPurchaseMode = savedState.isPurchaseMode;
            state.totalTicketsToBuy = savedState.totalTicketsToBuy;
            state.ticketsPurchased = savedState.ticketsPurchased;
            state.purchaseSearchNumbers = savedState.purchaseSearchNumbers;
            state.purchaseExcludeNumbers = savedState.purchaseExcludeNumbers;
            state.purchaseSearchMode = savedState.purchaseSearchMode;
            state.purchaseTicketsChecked = savedState.purchaseTicketsChecked || 0;
            state.purchaseStartTime = savedState.purchaseStartTime || null;
            
            console.log('Загружено состояние покупки:', {
                isPurchaseMode: state.isPurchaseMode,
                totalTicketsToBuy: state.totalTicketsToBuy,
                ticketsPurchased: state.ticketsPurchased,
                purchaseTicketsChecked: state.purchaseTicketsChecked,
                purchaseStartTime: state.purchaseStartTime ? new Date(state.purchaseStartTime).toLocaleTimeString() : null
            });
            
            // Проверяем авторизацию перед продолжением режима покупки
            if (state.isPurchaseMode && !window.stolotoAuth.isUserLoggedIn()) {
                console.log('❌ Пользователь вышел из аккаунта, отменяем режим покупки');
                window.stolotoUI.showAuthWarning();
                await resetPurchaseState();
                return;
            }
            
            // Если покупка еще не завершена, продолжаем поиск
            if (state.isPurchaseMode && state.ticketsPurchased < state.totalTicketsToBuy) {
                console.log('Продолжаем покупку билетов, осталось купить:', state.totalTicketsToBuy - state.ticketsPurchased);
                
                // Восстанавливаем счетчик просмотренных билетов и время поиска
                state.ticketsChecked = state.purchaseTicketsChecked;
                state.searchStartTime = state.purchaseStartTime;
                
                // Обновляем блок статуса
                window.stolotoUI.updateStatusBlock(state.purchaseSearchNumbers, state.purchaseExcludeNumbers, state.purchaseSearchMode);
                
                // Запускаем поиск с задержкой для загрузки страницы
                setTimeout(() => {
                    window.stolotoSearch.clearSelection().then(() => {
                        window.stolotoMain.clickNumbers(
                            state.purchaseSearchNumbers, 
                            state.purchaseSearchMode, 
                            state.purchaseExcludeNumbers
                        );
                    });
                }, 1500);
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке состояния покупки:', error);
    }
}

// Функция для сброса состояния покупки
async function resetPurchaseState() {
    const state = window.stolotoState;
    state.isPurchaseMode = false;
    state.totalTicketsToBuy = 0;
    state.ticketsPurchased = 0;
    state.purchaseSearchNumbers = [];
    state.purchaseExcludeNumbers = [];
    state.purchaseSearchMode = 'half';
    state.purchaseTicketsChecked = 0;
    state.purchaseStartTime = null;
    
    await chrome.storage.local.remove('purchaseState');
    console.log('Состояние покупки сброшено');
}

// Сохранение статуса авторизации пользователя
async function saveAuthStatus() {
    const isLoggedIn = window.stolotoAuth.isUserLoggedIn();
    
    // Получаем элементы страницы для отладки
    const authElements = Array.from(document.querySelectorAll('div'))
        .filter(div => div.textContent && div.textContent.toLowerCase().includes('вход'))
        .map(el => el.textContent.trim());
    
    console.log('Сохраняем статус авторизации:', isLoggedIn);
    console.log('Найдены элементы авторизации:', authElements);
    
    await chrome.storage.local.set({
        authStatus: {
            isLoggedIn,
            timestamp: Date.now()
        }
    });
}

// Экспорт функций в глобальное пространство
window.stolotoState = {
    ...window.stolotoState,
    savePurchaseState,
    loadPurchaseState,
    resetPurchaseState,
    saveAuthStatus
};
