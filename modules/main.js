/**
 * Main Module - Основная логика координации
 * Содержит главную функцию поиска и обработчик сообщений
 */

// Функция для поиска и клика по кнопкам
async function clickNumbers(numbers, mode, excludeNumbers = []) {
    const state = window.stolotoState;
    
    console.log('Начинаем работу с числами:', numbers, 'исключая:', excludeNumbers, 'режим:', mode);
    state.isSearching = true;
    state.searchMode = mode;
    
    // Если мы в режиме покупки и это новый поиск (без перезагрузки страницы)
    if (state.isPurchaseMode && !state.searchStartTime) {
        state.ticketsChecked = state.purchaseTicketsChecked || 0;
        state.searchStartTime = state.purchaseStartTime || Date.now();
    } else if (!state.isPurchaseMode) {
        // Обычный режим поиска - сбрасываем счетчики
        state.ticketsChecked = 0;
        state.searchStartTime = Date.now();
    }
    
    window.stolotoUI.updateStatusBlock(numbers, excludeNumbers, mode);
    
    // Функция ожидания появления кнопок с числами
    function waitForNumberButtons() {
        return new Promise((resolve) => {
            const checkButtons = () => {
                const allButtons = document.querySelectorAll('button');
                if (allButtons.length > 0) {
                    resolve();
                } else {
                    setTimeout(checkButtons, 500);
                }
            };
            checkButtons();
        });
    }

    // Сначала выбираем числа
    async function selectNumbers() {
        await waitForNumberButtons();
        
        for (const num of numbers) {
            if (!state.isSearching) return false;

            const buttons = Array.from(document.querySelectorAll('button'));
            const button = buttons.find(btn => {
                const text = btn.textContent.trim();
                return text === num.toString();
            });
            
            if (button) {
                console.log('Нажимаем на число:', num);
                button.click();
                // Ждем случайное время от 250мс до 1000мс
                const delay = Math.floor(Math.random() * (1000 - 250 + 1)) + 250;
                console.log(`Ждем ${delay}мс перед следующим нажатием...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.log('Кнопка не найдена для числа:', num);
            }
        }

        if (!state.isSearching) return false;

        // Ждем перед нажатием "Показать билеты"
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const showTicketsButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.trim() === 'Показать билеты'
        );
        
        if (showTicketsButton) {
            console.log('Нажимаем кнопку "Показать билеты"');
            showTicketsButton.click();
            // Ждем загрузки билетов
            await new Promise(resolve => setTimeout(resolve, 1000));
            return true;
        } else {
            console.log('Кнопка "Показать билеты" не найдена');
            return false;
        }
    }

    // Запускаем процесс
    const numbersSelected = await selectNumbers();
    if (numbersSelected && state.isSearching) {
        await window.stolotoSearch.findSuitableTicket(numbers);
    }
}

// Обработчик сообщений от popup.js
function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const state = window.stolotoState;
        
        console.log('Получено сообщение:', request);
        
        if (request.action === 'clickNumbers') {
            // Проверяем, требуется ли авторизация для режима покупки
            const needsAuth = request.isPurchaseMode;
            
            // Если режим покупки и пользователь не авторизован
            if (needsAuth && !window.stolotoAuth.isUserLoggedIn()) {
                console.log('❌ Пользователь не авторизован для использования режима покупки');
                window.stolotoUI.showAuthWarning();
                // Сохраняем текущий статус авторизации
                state.saveAuthStatus();
                sendResponse({
                    status: 'error', 
                    message: 'Для использования режима автоматической покупки необходимо авторизоваться на сайте Столото'
                });
                return true;
            }
            
            // Устанавливаем параметры режима автоматической покупки
            state.isPurchaseMode = request.isPurchaseMode || false;
            state.totalTicketsToBuy = request.ticketsToBuy || 0;
            state.purchaseSearchNumbers = request.numbers;
            state.purchaseExcludeNumbers = request.excludeNumbers || [];
            state.purchaseSearchMode = request.mode;
            
            // Если режим покупки активен и это новый запуск, сбрасываем счетчики
            if (state.isPurchaseMode) {
                // Если запускаем новую сессию покупки, сбрасываем счетчики
                state.ticketsPurchased = 0;
                state.purchaseTicketsChecked = 0;
                state.purchaseStartTime = Date.now();
                state.savePurchaseState();
            }
            
            // Сначала очищаем предыдущий выбор
            window.stolotoSearch.clearSelection().then(() => {
                clickNumbers(request.numbers, request.mode, request.excludeNumbers || []);
                sendResponse({status: 'success'});
            });
            return true;
            
        } else if (request.action === 'stopSearch') {
            console.log('Останавливаем поиск и обновляем страницу...');
            state.isSearching = false;
            state.searchStartTime = null;
            window.stolotoUI.removeStatusBlock();
            
            // Если был активен режим покупки, сбрасываем его
            if (state.isPurchaseMode) {
                state.resetPurchaseState();
            }
            
            // Сначала очищаем выбранные числа
            window.stolotoSearch.clearSelection().then(() => {
                sendResponse({status: 'stopped'});
                setTimeout(() => window.location.reload(), 100);
            });
            return true;
            
        } else if (request.action === 'checkUserLogin') {
            // Проверяем, авторизован ли пользователь
            const isLoggedIn = window.stolotoAuth.isUserLoggedIn();
            console.log('Проверка авторизации пользователя (checkUserLogin):', isLoggedIn);
            
            // Дополнительная информация для отладки
            const profileMenu = document.querySelector('[data-test-id="profile-menu"], .profile-menu, .user-profile');
            const userAvatar = document.querySelector('.user-avatar, .account-avatar, [data-test-id="user-avatar"]');
            console.log('Найдены элементы авторизации:', { 
                profileMenu: profileMenu ? true : false, 
                userAvatar: userAvatar ? true : false 
            });
            
            // Сохраняем статус авторизации
            state.saveAuthStatus();
            sendResponse({
                isLoggedIn: isLoggedIn
            });
            return true;
            
        } else if (request.action === 'checkUserBalance') {
            // Проверяем баланс пользователя для заданного количества билетов
            const ticketsToBuy = request.ticketsToBuy || 1;
            const userBalance = window.stolotoAuth.getUserBalance();
            const hasEnough = window.stolotoAuth.hasEnoughFunds(ticketsToBuy);
            
            console.log('Проверка баланса пользователя:', userBalance, 'руб.');
            console.log('Требуется для', ticketsToBuy, 'билетов:', ticketsToBuy * 150, 'руб.');
            console.log('Достаточно средств:', hasEnough);
            
            sendResponse({
                balance: userBalance,
                hasEnoughFunds: hasEnough,
                requiredAmount: ticketsToBuy * 150
            });
            return true;
        }
    });
}

// Экспорт функций в глобальное пространство
window.stolotoMain = {
    clickNumbers,
    setupMessageListener
};
