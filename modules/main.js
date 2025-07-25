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
    
    // Функция ожидания появления кнопок с числами в модальном окне
    function waitForNumberButtons() {
        return new Promise((resolve) => {
            const checkButtons = () => {
                // Ищем именно кнопки с числами в модальном окне
                const numberButtons = document.querySelectorAll('dialog button, [data-test-id="number-list"] button');
                const hasNumberButtons = Array.from(numberButtons).some(btn => /^\d+$/.test(btn.textContent.trim()));
                
                if (hasNumberButtons) {
                    console.log(`✅ Найдено ${numberButtons.length} кнопок в модальном окне`);
                    resolve();
                } else {
                    console.log('⏳ Ждем появления кнопок с числами в модальном окне...');
                    setTimeout(checkButtons, 500);
                }
            };
            checkButtons();
        });
    }

    // Функция открытия модального окна выбора чисел
    async function openModal() {
        const chooseNumbersButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.trim() === 'Выбрать числа'
        );
        
        if (chooseNumbersButton) {
            console.log('Открываем модальное окно выбора чисел');
            chooseNumbersButton.click();
            // Увеличиваем время ожидания загрузки модального окна
            console.log('Ждем 2 секунды для загрузки модального окна...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
        } else {
            console.log('Кнопка "Выбрать числа" не найдена');
            return false;
        }
    }

    // Сначала выбираем числа
    async function selectNumbers() {
        await waitForNumberButtons();
        
        console.log(`Начинаем выбор ${numbers.length} чисел:`, numbers);
        
        // Дополнительное ожидание для полной загрузки модального окна
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        for (let i = 0; i < numbers.length; i++) {
            const num = numbers[i];
            if (!state.isSearching) return false;

            console.log(`Ищем кнопку для числа ${num} (${i + 1} из ${numbers.length})`);
            
            // Ищем кнопки только в модальном окне с числами (более специфичный селектор)
            const numberButtons = Array.from(document.querySelectorAll('dialog button, [data-test-id="number-list"] button'));
            console.log(`Найдено ${numberButtons.length} кнопок с числами в модальном окне`);
            
            const button = numberButtons.find(btn => {
                const text = btn.textContent.trim();
                return text === num.toString() && /^\d+$/.test(text);
            });
            
            if (button) {
                console.log(`✓ Найдена кнопка для числа: ${num}`);
                button.click();
                
                // Фиксированная задержка для стабильности
                console.log(`Ждем 800мс для обработки клика...`);
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // Проверяем, что число действительно выбрано
                const selectedButtons = Array.from(document.querySelectorAll('dialog button, [data-test-id="number-list"] button'))
                    .filter(btn => btn.textContent.trim() === num.toString());
                
                if (selectedButtons.length > 0) {
                    console.log(`✅ Число ${num} успешно выбрано`);
                } else {
                    console.log(`⚠️ Число ${num} может быть не выбрано, повторяем клик...`);
                    button.click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } else {
                console.log(`✗ Кнопка НЕ найдена для числа: ${num}`);
                console.log('Доступные кнопки с числами:', numberButtons
                    .filter(btn => /^\d+$/.test(btn.textContent.trim()))
                    .map(btn => btn.textContent.trim())
                    .slice(0, 15) // Показываем больше для отладки
                );
                return false; // Прерываем выполнение, если число не найдено
            }
        }

        console.log('Завершен выбор всех чисел. Проверяем статус поиска...');
        if (!state.isSearching) return false;

        // Увеличиваем задержку перед нажатием "Показать билеты"
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const showTicketsButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.trim() === 'Показать билеты'
        );
        
        if (showTicketsButton) {
            console.log('Нажимаем кнопку "Показать билеты"');
            showTicketsButton.click();
            // Увеличиваем время ожидания загрузки билетов
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
        } else {
            console.log('Кнопка "Показать билеты" не найдена');
            return false;
        }
    }

    // Запускаем процесс
    // Сначала открываем модальное окно
    const modalOpened = await openModal();
    if (!modalOpened || !state.isSearching) {
        console.log('Не удалось открыть модальное окно или поиск был остановлен');
        return;
    }
    
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
            
            // Сохраняем исключаемые числа для обычного режима
            if (!state.isPurchaseMode) {
                state.excludeNumbers = request.excludeNumbers || [];
            }
            
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
            
        } else if (request.action === 'checkPageLoadState') {
            // Проверяем только наличие кнопки "Выбрать числа" и сразу возвращаем результат
            const selectNumbersButton = Array.from(document.querySelectorAll('button')).find(btn => 
                btn.textContent.trim() === 'Выбрать числа'
            );
            sendResponse({
                isReady: !!selectNumbersButton,
                isStolotoPage: window.location.hostname.includes('stoloto.ru')
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
