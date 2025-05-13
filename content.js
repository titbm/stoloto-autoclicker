// Сообщаем о загрузке скрипта
console.log('Столото Автокликер: content script загружен');

// Стили для блока состояния
const STATUS_STYLES = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #007bff;
    color: white;
    padding: 10px 20px;
    font-size: 16px;
    z-index: 10000;
    text-align: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`;

// Новые глобальные переменные для режима покупки
let isPurchaseModeActive = false;
let ticketsToBuyTotal = 0;
let ticketsSuccessfullyPurchased = 0;
let initialSearchParams = {}; // Для сохранения исходных параметров поиска при покупке

// Функция для создания/обновления блока состояния
function updateStatusBlock(numbers, excludeNumbers, mode, customMessage = '', isError = false) {
    let statusEl = document.getElementById('rusloto-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'rusloto-status';
        document.body.insertBefore(statusEl, document.body.firstChild);
    }
    statusEl.style.cssText = STATUS_STYLES; // Применяем стили каждый раз

    if (isError) {
        statusEl.style.background = '#f44336'; // Красный фон для ошибок
        statusEl.textContent = customMessage;
        return;
    } else {
        statusEl.style.background = '#007bff'; // Стандартный фон
        if (customMessage) {
            statusEl.style.background = '#28a745'; // Зеленый фон для успеха
            statusEl.textContent = customMessage;
            return;
        }
    }

    let modeText = '';
    switch(mode) {
        case 'anywhere':
            modeText = 'в любом месте билета';
            break;
        case 'half':
            modeText = 'в одной половине билета';
            break;
        case 'row':
            modeText = 'в одной строке билета';
            break;
    }

    const numbersText = numbers.join(', ');
    const excludeText = excludeNumbers.length > 0 
        ? ` за исключением ${excludeNumbers.join(', ')}` 
        : '';
    const ticketsText = ticketsChecked > 0 ? `. Проверено билетов: ${ticketsChecked}` : '';
    const timeText = searchStartTime ? `. Время поиска: ${formatSearchTime()}` : '';
    
    let purchaseStatusText = '';
    if (isPurchaseModeActive) {
        purchaseStatusText = `. Куплено: ${ticketsSuccessfullyPurchased} из ${ticketsToBuyTotal}`;
    }
    
    statusEl.textContent = `Ищем числа ${numbersText}${excludeText} ${modeText}${ticketsText}${timeText}${purchaseStatusText}`;
}

// Функция для удаления блока состояния
function removeStatusBlock() {
    const statusEl = document.getElementById('rusloto-status');
    if (statusEl) {
        statusEl.remove();
    }
}

// Флаг для отслеживания состояния поиска
let isSearching = false;
let ticketsChecked = 0; // Счетчик просмотренных билетов
let searchStartTime = null; // Время начала поиска
let currentMode = 'half'; // Для хранения текущего режима поиска/покупки

// Функция для форматирования времени
function formatSearchTime() {
    if (!searchStartTime) return '';
    const seconds = Math.floor((Date.now() - searchStartTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}м ${remainingSeconds}с`;
}

// Функция очистки выбранных чисел
async function clearSelection() {
    // Находим и нажимаем кнопку "Очистить"
    const clearButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.trim() === 'Очистить'
    );
    
    if (clearButton) {
        clearButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
    }
    return false;
}

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

// Адаптированная функция selectNumbers
async function selectInitialNumbers(numbersToSelect) {
    console.log('selectInitialNumbers вызвана с числами:', numbersToSelect); // Отладка
    await waitForNumberButtons();
    
    for (const num of numbersToSelect) {
        if (!isSearching) return false;

        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find(btn => {
            const text = btn.textContent.trim();
            return text === num.toString();
        });
        
        if (button) {
            console.log('Нажимаем на число:', num);
            button.click();
            const delay = Math.floor(Math.random() * (700 - 200 + 1)) + 200;
            await new Promise(resolve => setTimeout(resolve, delay));
        } else {
            console.log('Кнопка не найдена для числа:', num);
        }
    }

    if (!isSearching) return false;
    console.log('Числа выбраны, ожидание перед поиском кнопки "Показать билеты"'); // Отладка
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const showTicketsButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.trim() === 'Показать билеты'
    );
    
    if (showTicketsButton) {
        console.log('Нажимаем кнопку "Показать билеты"');
        showTicketsButton.click();
        await new Promise(resolve => setTimeout(resolve, 1500));
        return true;
    } else {
        console.log('Кнопка "Показать билеты" не найдена');
        updateStatusBlock(initialSearchParams.numbers, initialSearchParams.excludeNumbers, currentMode, 'Кнопка "Показать билеты" не найдена', true);
        isSearching = false;
        return false;
    }
}

// Модифицированная функция для анализа билета
function analyzeTicket(ticket, numbersToFind, excludeNumbersList, searchModeToUse) {
    const allNumbers = Array.from(ticket.querySelectorAll('[data-test-id="number"], [data-test-id="selected-number"]'));
    const rows = [];
    for (let i = 0; i < allNumbers.length; i += 9) {
        rows.push(allNumbers.slice(i, i + 9));
    }
    
    if (rows.length !== 6) {
        console.log('Неверное количество строк в билете');
        return false;
    }

    const ticketNumbers = rows.flat().map(numEl => parseInt(numEl.textContent.trim())).filter(num => !isNaN(num));

    if (excludeNumbersList && excludeNumbersList.length > 0) {
        const hasExcluded = excludeNumbersList.some(num => ticketNumbers.includes(parseInt(num)));
        if (hasExcluded) {
            return false;
        }
    }

    switch (searchModeToUse) {
        case 'row': {
            for (const row of rows) {
                const rowNumbers = row.map(numEl => parseInt(numEl.textContent.trim())).filter(num => !isNaN(num));
                if (numbersToFind.every(num => rowNumbers.includes(parseInt(num)))) {
                    return true;
                }
            }
            return false;
        }
        case 'half': {
            const firstHalf = rows.slice(0, 3).flat().map(numEl => parseInt(numEl.textContent.trim())).filter(num => !isNaN(num));
            const secondHalf = rows.slice(3).flat().map(numEl => parseInt(numEl.textContent.trim())).filter(num => !isNaN(num));
            if (numbersToFind.every(num => firstHalf.includes(parseInt(num)))) return true;
            if (numbersToFind.every(num => secondHalf.includes(parseInt(num)))) return true;
            return false;
        }
        case 'anywhere': {
            return numbersToFind.every(num => ticketNumbers.includes(parseInt(num)));
        }
        default:
            console.error('Неизвестный режим поиска:', searchModeToUse);
            return false;
    }
}

// Основная функция для запуска поиска или покупки
async function startActionHandler(params) {
    console.log('Запуск действия с параметрами:', params);
    isSearching = true;
    searchStartTime = Date.now();
    ticketsChecked = 0;

    isPurchaseModeActive = params.isPurchaseMode;
    ticketsToBuyTotal = params.ticketsToBuyTotal || 0;
    if (!params.resuming) { 
         ticketsSuccessfullyPurchased = 0;
    } else {
        ticketsSuccessfullyPurchased = params.ticketsBoughtCount || 0;
    }

    currentMode = params.mode;
    initialSearchParams = { 
        numbers: params.numbers,
        excludeNumbers: params.excludeNumbers,
        mode: params.mode,
        isPurchaseMode: params.isPurchaseMode,
        ticketsToBuyTotal: params.ticketsToBuyTotal,
        ticketsBoughtCount: ticketsSuccessfullyPurchased, 
        selectionDone: params.selectionDone || false, 
    };
    
    updateStatusBlock(initialSearchParams.numbers, initialSearchParams.excludeNumbers, currentMode);
    await processTicketsCycle();
}

async function processTicketsCycle() {
    const { numbers, excludeNumbers, mode } = initialSearchParams;
    
    if (!initialSearchParams.selectionDone) {
        console.log('Этап выбора чисел (selectionDone=false). Вызов selectInitialNumbers.');
        const selectionSuccessful = await selectInitialNumbers(numbers);
        if (!selectionSuccessful) {
            isSearching = false; 
            return;
        }
        initialSearchParams.selectionDone = true; 
        if (isPurchaseModeActive) {
            await chrome.storage.local.set({ resumePurchaseState: { ...initialSearchParams, ticketsBoughtCount: ticketsSuccessfullyPurchased, selectionDone: true } });
        }
    }
    
    if (initialSearchParams.hasOwnProperty('resumingAfterPurchase')) {
        delete initialSearchParams.resumingAfterPurchase; 
        if (isPurchaseModeActive) { 
            let currentResumeState = await chrome.storage.local.get('resumePurchaseState');
            if (currentResumeState.resumePurchaseState) {
                delete currentResumeState.resumePurchaseState.resumingAfterPurchase;
                await chrome.storage.local.set({ resumePurchaseState: currentResumeState.resumePurchaseState });
            }
        }
    }

    while (isSearching) {
        if (isPurchaseModeActive && ticketsSuccessfullyPurchased >= ticketsToBuyTotal) {
            console.log(`🎉 Требуемое количество билетов (${ticketsToBuyTotal}) куплено!`);
            updateStatusBlock(numbers, excludeNumbers, mode, `Все ${ticketsToBuyTotal} билета(ов) куплены!`);
            isSearching = false;
            await chrome.storage.local.remove('resumePurchaseState');
            break;
        }

        const ticketsOnPage = document.querySelectorAll('button[class*="Ticket_btn"]');
        console.log(`На странице найдено ${ticketsOnPage.length} билетов для анализа.`);
        let foundSuitableTicketsThisPage = [];

        for (const ticketElement of ticketsOnPage) {
            if (!isSearching) break;
            ticketsChecked++;
            updateStatusBlock(numbers, excludeNumbers, mode); 
            if (analyzeTicket(ticketElement, numbers, excludeNumbers, mode)) {
                foundSuitableTicketsThisPage.push(ticketElement);
            }
        }

        if (!isSearching) break;

        if (foundSuitableTicketsThisPage.length > 0) {
            console.log(`🎯 Найдено ${foundSuitableTicketsThisPage.length} подходящих билетов.`);
            if (!isPurchaseModeActive) {
                for (const ticket of foundSuitableTicketsThisPage) {
                    ticket.click(); 
                    await new Promise(resolve => setTimeout(resolve, 200)); 
                }
                updateStatusBlock(numbers, excludeNumbers, mode, `Найдены подходящие билеты: ${foundSuitableTicketsThisPage.length} шт.`);
                isSearching = false; 
                break; 
            } else {
                // РЕЖИМ ПОКУПКИ
                const ticketsToSelectCount = Math.min(foundSuitableTicketsThisPage.length, ticketsToBuyTotal - ticketsSuccessfullyPurchased);
                console.log(`Режим покупки: нужно ${ticketsToBuyTotal - ticketsSuccessfullyPurchased} еще. Доступно: ${ticketsToSelectCount}`);

                if (ticketsToSelectCount > 0) {
                    for (let i = 0; i < ticketsToSelectCount; i++) {
                        if (!isSearching) break;
                        foundSuitableTicketsThisPage[i].click(); 
                        console.log('Выбран билет:', foundSuitableTicketsThisPage[i].querySelector('[data-test-id="ticket-number"]')?.textContent || 'неизвестен');
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                    if (!isSearching) break;

                    const payByWalletButton = Array.from(document.querySelectorAll('button')).find(
                        btn => btn.textContent.trim().includes('Оплатить кошельком')
                    );

                    if (payByWalletButton) {
                        console.log('Кнопка "Оплатить кошельком" найдена. Нажимаем...');
                        payByWalletButton.click();
                        ticketsSuccessfullyPurchased += ticketsToSelectCount;
                        initialSearchParams.ticketsBoughtCount = ticketsSuccessfullyPurchased;
                        updateStatusBlock(numbers, excludeNumbers, mode, `${ticketsToSelectCount} отправлен(ы) на оплату. Куплено: ${ticketsSuccessfullyPurchased}/${ticketsToBuyTotal}`);
                        
                        if (ticketsSuccessfullyPurchased >= ticketsToBuyTotal) {
                            updateStatusBlock(numbers, excludeNumbers, mode, `Все ${ticketsToBuyTotal} билета(ов) куплены!`);
                            isSearching = false;
                            await chrome.storage.local.remove('resumePurchaseState');
                            break; 
                        } else {
                            console.log(`Куплено ${ticketsSuccessfullyPurchased}/${ticketsToBuyTotal}. Перезагрузка через 10 сек.`);
                            await chrome.storage.local.set({ 
                                resumePurchaseState: { 
                                    ...initialSearchParams, 
                                    ticketsBoughtCount: ticketsSuccessfullyPurchased, 
                                    selectionDone: false, 
                                } 
                            });
                            await new Promise(resolve => setTimeout(resolve, 10000));
                            window.location.reload();
                            return; 
                        }
                    } else {
                        updateStatusBlock(numbers, excludeNumbers, mode, 'Где бабки то?', true);
                        isSearching = false;
                        await chrome.storage.local.remove('resumePurchaseState');
                        break;
                    }
                } else {
                    console.log('Нет доступных для покупки билетов на этой странице.');
                }
            }
        } else {
            console.log('Подходящих билетов на этой странице не найдено.');
        }

        if (!isSearching) break;
        if (isPurchaseModeActive && ticketsSuccessfullyPurchased >= ticketsToBuyTotal) {
             updateStatusBlock(numbers, excludeNumbers, mode, `Все ${ticketsToBuyTotal} билета(ов) куплены!`);
             isSearching = false;
             await chrome.storage.local.remove('resumePurchaseState');
             break;
        }

        if (isSearching) {
            const otherTicketsButton = Array.from(document.querySelectorAll('button')).find(
                btn => btn.textContent.trim() === 'Другие билеты'
            );
            if (otherTicketsButton) {
                otherTicketsButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000)); 
                initialSearchParams.selectionDone = false; 
                if (isPurchaseModeActive) {
                     await chrome.storage.local.set({ resumePurchaseState: { ...initialSearchParams, ticketsBoughtCount: ticketsSuccessfullyPurchased, selectionDone: false } });
                }
            } else {
                if (!isPurchaseModeActive || (isPurchaseModeActive && ticketsSuccessfullyPurchased < ticketsToBuyTotal)) {
                     updateStatusBlock(numbers, excludeNumbers, mode, 'Билеты не найдены, "Другие билеты" отсутствует.');
                }
                isSearching = false;
                break;
            }
        }
    }
    if (!isSearching && !(isPurchaseModeActive && ticketsSuccessfullyPurchased < ticketsToBuyTotal && initialSearchParams.resumingAfterPurchase)) {
        await chrome.storage.local.remove('resumePurchaseState');
    }
}

// Слушаем сообщения от popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Получено сообщение от popup:', request);
    if (request.action === 'startAction') {
        clearSelection().then(() => {
            startActionHandler(request); // Вызываем новый обработчик
            sendResponse({status: 'Action started'});
        });
        return true; // Важно для асинхронного sendResponse
    } else if (request.action === 'stopSearch') {
        console.log('Останавливаем поиск/покупку...');
        isSearching = false;
        searchStartTime = null;
        removeStatusBlock();
        chrome.storage.local.remove('resumePurchaseState');
        clearSelection().then(() => {
            sendResponse({status: 'stopped'});
            setTimeout(() => window.location.reload(), 100); // Возвращаем перезагрузку страницы
        });
        return true; // Важно для асинхронного sendResponse
    }
});

// Логика возобновления покупки после перезагрузки страницы
async function tryResumePurchase() {
    const data = await chrome.storage.local.get('resumePurchaseState');
    if (data.resumePurchaseState && data.resumePurchaseState.isPurchaseMode) { 
        console.log('Возобновление покупки:', data.resumePurchaseState);
        const state = data.resumePurchaseState;
        
        isPurchaseModeActive = true; 
        ticketsToBuyTotal = state.ticketsToBuyTotal;
        ticketsSuccessfullyPurchased = state.ticketsBoughtCount; 
        currentMode = state.mode;

        const actionParams = { 
            numbers: state.numbers,
            excludeNumbers: state.excludeNumbers,
            mode: state.mode,
            isPurchaseMode: true, 
            ticketsToBuyTotal: state.ticketsToBuyTotal,
            ticketsBoughtCount: state.ticketsBoughtCount, 
            selectionDone: state.selectionDone, 
            resuming: true 
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                startActionHandler(actionParams);
            });
        } else {
            startActionHandler(actionParams);
        }
    }
}

// Вызываем попытку возобновления при загрузке скрипта
tryResumePurchase();
