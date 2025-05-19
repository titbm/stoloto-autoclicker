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
    white-space: pre-line;
`;

// Функция для создания/обновления блока состояния
function updateStatusBlock(numbers, excludeNumbers, mode) {
    let statusEl = document.getElementById('rusloto-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'rusloto-status';
        statusEl.style.cssText = STATUS_STYLES;
        document.body.insertBefore(statusEl, document.body.firstChild);
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
    const ticketsText = ticketsChecked > 0 ? `Проверено билетов: ${ticketsChecked}` : '';
    const timeText = searchStartTime ? `Время поиска: ${formatSearchTime()}` : '';
    
    let statusText = `Ищем числа ${numbersText}${excludeText} ${modeText}`;
    
    // Добавляем информацию о поиске
    if (ticketsText || timeText) {
        statusText += `\n${ticketsText}${ticketsText && timeText ? '. ' : ''}${timeText}`;
    }
      // Если активен режим покупки, добавляем информацию о нём
    if (isPurchaseMode) {
        const purchaseText = `Тестовый режим покупки. Куплено билетов: ${ticketsPurchased} из ${totalTicketsToBuy}`;
        statusText += `\n${purchaseText}`;
        
        // Меняем цвет только когда процесс покупки завершен
        if (ticketsPurchased >= totalTicketsToBuy) {
            statusEl.style.background = '#28a745'; // зеленый - завершено
        } else {
            // В процессе поиска сохраняем стандартный синий цвет
            statusEl.style.background = '#007bff';
        }
    }
    
    statusEl.textContent = statusText;
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
let searchMode = 'half'; // Режим поиска по умолчанию
let ticketsChecked = 0; // Счетчик просмотренных билетов
let searchStartTime = null; // Время начала поиска

// Переменные для тестового режима покупки
let isPurchaseMode = false; // Флаг режима покупки
let totalTicketsToBuy = 0; // Общее количество билетов для покупки
let ticketsPurchased = 0; // Количество "купленных" билетов
let purchaseSearchNumbers = []; // Числа для поиска в режиме покупки
let purchaseExcludeNumbers = []; // Исключаемые числа в режиме покупки
let purchaseSearchMode = 'half'; // Режим поиска в режиме покупки
let purchaseTicketsChecked = 0; // Счетчик просмотренных билетов в режиме покупки
let purchaseStartTime = null; // Время начала поиска в режиме покупки

// Сохранение состояния покупки
async function savePurchaseState() {
    await chrome.storage.local.set({
        purchaseState: {
            isPurchaseMode,
            totalTicketsToBuy,
            ticketsPurchased,
            purchaseSearchNumbers,
            purchaseExcludeNumbers,
            purchaseSearchMode,
            purchaseTicketsChecked,
            purchaseStartTime,
            timestamp: Date.now()
        }
    });
    console.log('Состояние покупки сохранено:', {
        ticketsPurchased,
        totalTicketsToBuy,
        purchaseSearchNumbers,
        purchaseTicketsChecked,
        purchaseStartTime: purchaseStartTime ? new Date(purchaseStartTime).toLocaleTimeString() : null
    });
}

// Загрузка состояния покупки
async function loadPurchaseState() {
    try {
        const data = await chrome.storage.local.get('purchaseState');
        if (data.purchaseState) {
            isPurchaseMode = data.purchaseState.isPurchaseMode;
            totalTicketsToBuy = data.purchaseState.totalTicketsToBuy;
            ticketsPurchased = data.purchaseState.ticketsPurchased;
            purchaseSearchNumbers = data.purchaseState.purchaseSearchNumbers;
            purchaseExcludeNumbers = data.purchaseState.purchaseExcludeNumbers;
            purchaseSearchMode = data.purchaseState.purchaseSearchMode;
            purchaseTicketsChecked = data.purchaseState.purchaseTicketsChecked || 0;
            purchaseStartTime = data.purchaseState.purchaseStartTime || null;
            
            console.log('Загружено состояние покупки:', {
                isPurchaseMode,
                totalTicketsToBuy,
                ticketsPurchased,
                purchaseTicketsChecked,
                purchaseStartTime: purchaseStartTime ? new Date(purchaseStartTime).toLocaleTimeString() : null
            });
            
            // Проверяем авторизацию перед продолжением режима покупки
            if (isPurchaseMode && !isUserLoggedIn()) {
                console.log('❌ Пользователь вышел из аккаунта, отменяем режим покупки');
                showAuthWarning();
                await resetPurchaseState();
                return;
            }
            
            // Если покупка еще не завершена, продолжаем поиск
            if (isPurchaseMode && ticketsPurchased < totalTicketsToBuy) {
                console.log('Продолжаем покупку билетов, осталось купить:', totalTicketsToBuy - ticketsPurchased);
                
                // Восстанавливаем счетчик просмотренных билетов и время поиска
                ticketsChecked = purchaseTicketsChecked;
                searchStartTime = purchaseStartTime;
                
                // Обновляем блок статуса
                updateStatusBlock(purchaseSearchNumbers, purchaseExcludeNumbers, purchaseSearchMode);
                
                // Запускаем поиск с задержкой для загрузки страницы
                setTimeout(() => {
                    clearSelection().then(() => {
                        clickNumbers(
                            purchaseSearchNumbers, 
                            purchaseSearchMode, 
                            purchaseExcludeNumbers
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
    isPurchaseMode = false;
    totalTicketsToBuy = 0;
    ticketsPurchased = 0;
    purchaseSearchNumbers = [];
    purchaseExcludeNumbers = [];
    purchaseSearchMode = 'half';
    purchaseTicketsChecked = 0;
    purchaseStartTime = null;
    
    await chrome.storage.local.remove('purchaseState');
    console.log('Состояние покупки сброшено');
}

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

// Функция для проверки наличия кнопок оплаты
function checkPaymentButtons() {
    const allButtons = Array.from(document.querySelectorAll('button'));
    
    // Ищем кнопки оплаты по их тексту
    const payByWalletButton = allButtons.find(btn => 
        btn.textContent.trim().includes('Оплатить кошельком') || 
        btn.textContent.trim().includes('Оплатить со счета')
    );
    
    const payByQRButton = allButtons.find(btn => 
        btn.textContent.trim().includes('QR') || 
        btn.textContent.trim().includes('Оплатить по QR')
    );
    
    return {
        walletPaymentAvailable: !!payByWalletButton,
        qrPaymentAvailable: !!payByQRButton
    };
}

// Функция для проверки, авторизован ли пользователь на сайте
function isUserLoggedIn() {
    // Метод 1: Проверка наличия меню профиля - самый надежный индикатор
    const profileMenu = document.querySelector('[data-test-id="profile-menu"], .profile-menu, .user-profile');
    
    // Метод 2: Проверка наличия аватара пользователя
    const userAvatar = document.querySelector('.user-avatar, .account-avatar, [data-test-id="user-avatar"]');
    
    // Метод 3: Проверка наличия имени пользователя или персонального меню
    const userNameElement = document.querySelector('.profile-name, .user-name, .account-name');
    
    // Метод 4: Проверка наличия блока "Мой кабинет" или "Личный кабинет"
    const personalCabinetElements = Array.from(document.querySelectorAll('a, span, div, button'));
    const personalCabinetElement = personalCabinetElements.find(
        el => {
            if (!el || !el.textContent) return false;
            const text = el.textContent.trim().toLowerCase();
            return text === 'мой кабинет' || text === 'личный кабинет' || text.includes('личный') && text.includes('кабинет');
        }
    );
    
    // Метод 5: Проверка наличия меню кошелька, баланса или счета 
    const walletElement = document.querySelector('.user-balance, .wallet, [data-test-id="user-balance"]');
    
    // Метод 6: Конкретная проверка на блок входа (если видим этот блок - пользователь НЕ авторизован)
    const loginElements = Array.from(document.querySelectorAll('div, a, button, span'));
    const specificAuthBlock = loginElements.find(
        el => {
            if (!el || !el.textContent) return false;
            const text = el.textContent.trim().toLowerCase();
            return text === 'вход и регистрация' || text === 'войти' || text === 'вход';
        }
    );
    
    // Метод 7: Поиск подписи с username или email
    const possibleUsernames = Array.from(document.querySelectorAll('span, div')).filter(
        el => el.textContent && el.textContent.includes('@') && el.textContent.length < 40
    );
    
    // Вывод для отладки
    console.log('Проверка авторизации:', { 
        'profileMenu': !!profileMenu, 
        'userAvatar': !!userAvatar,
        'userNameElement': !!userNameElement,
        'personalCabinetElement': !!personalCabinetElement,
        'walletElement': !!walletElement,
        'specificAuthBlock': !!specificAuthBlock,
        'possibleUsernames': possibleUsernames.length > 0
    });
    
    // Проверяем наличие индикаторов авторизованного пользователя
    const hasProfileIndicators = !!(profileMenu || userAvatar || userNameElement || personalCabinetElement || walletElement || possibleUsernames.length > 0);
    
    // Если есть конкретный блок "Вход и регистрация", то пользователь НЕ авторизован,
    // иначе проверяем наличие хотя бы одного индикатора профиля
    if (specificAuthBlock) {
        console.log('Обнаружен блок входа/регистрации - пользователь НЕ авторизован');
        return false;
    } else if (hasProfileIndicators) {
        console.log('Обнаружены индикаторы профиля - пользователь авторизован');
        return true;
    } else {
        // Если документ еще загружается, даем ему время и проверяем еще раз
        if (document.readyState !== 'complete') {
            console.log('Документ еще не полностью загружен, продолжаем проверку...');
            // При повторном вызове важно не попасть в бесконечную рекурсию,
            // поэтому просто возвращаем true если документ еще грузится
            return true;
        }
        
        // Если никаких признаков не найдено и документ загружен полностью, считаем что пользователь не авторизован
        console.log('Не обнаружено индикаторов профиля - пользователь НЕ авторизован');
        return false;
    }
}

// Функция для отображения предупреждения о необходимости авторизации
function showAuthWarning() {
    let warningEl = document.getElementById('rusloto-auth-warning');
    if (!warningEl) {
        warningEl = document.createElement('div');
        warningEl.id = 'rusloto-auth-warning';
        warningEl.style.cssText = `
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            background: #dc3545;
            color: white;
            padding: 10px 20px;
            font-size: 16px;
            z-index: 10000;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        warningEl.textContent = 'Для использования тестового режима покупки необходимо авторизоваться на сайте Столото!';
        document.body.appendChild(warningEl);
    }
    
    // Скрываем предупреждение через 5 секунд
    setTimeout(() => {
        if (warningEl && warningEl.parentNode) {
            warningEl.remove();
        }
    }, 5000);
}

// Функция для поиска и клика по кнопкам
async function clickNumbers(numbers, mode, excludeNumbers = []) {
    console.log('Начинаем работу с числами:', numbers, 'исключая:', excludeNumbers, 'режим:', mode);
    isSearching = true;
    searchMode = mode;
    
    // Если мы в режиме покупки и это новый поиск (без перезагрузки страницы)
    if (isPurchaseMode && !searchStartTime) {
        ticketsChecked = purchaseTicketsChecked || 0;
        searchStartTime = purchaseStartTime || Date.now();
    } else if (!isPurchaseMode) {
        // Обычный режим поиска - сбрасываем счетчики
        ticketsChecked = 0;
        searchStartTime = Date.now();
    }
    
    updateStatusBlock(numbers, excludeNumbers, mode);
    
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
            if (!isSearching) return false;

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

        if (!isSearching) return false;

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

    // Функция для анализа билета
    function analyzeTicket(ticket, numbers) {
        const allNumbers = Array.from(ticket.querySelectorAll('[data-test-id="number"], [data-test-id="selected-number"]'));
        
        // Группируем числа по 9 (в каждой строке по 9 чисел)
        const rows = [];
        for (let i = 0; i < allNumbers.length; i += 9) {
            rows.push(allNumbers.slice(i, i + 9));
        }
        
        if (rows.length !== 6) {
            console.log('Неверное количество строк в билете');
            return false;
        }

        console.log('Анализ билета:', ticket.querySelector('[data-test-id="ticket-number"]')?.textContent);

        // Получаем все числа из билета
        const ticketNumbers = rows
            .flat()
            .map(num => parseInt(num.textContent.trim()))
            .filter(num => !isNaN(num));

        // Проверяем, нет ли исключаемых чисел в билете
        if (excludeNumbers.length > 0) {
            const hasExcluded = excludeNumbers.some(num => ticketNumbers.includes(parseInt(num)));
            if (hasExcluded) {
                console.log('❌ В билете найдены исключаемые числа');
                return false;
            }
        }

        switch (searchMode) {
            case 'row': {
                // Проверяем каждую строку
                for (const row of rows) {
                    const rowNumbers = row
                        .map(num => parseInt(num.textContent.trim()))
                        .filter(num => !isNaN(num));
                        
                    const allInRow = numbers.every(num => rowNumbers.includes(parseInt(num)));
                    if (allInRow) {
                        console.log('✅ Все числа найдены в одной строке!');
                        return true;
                    }
                }
                return false;
            }
            case 'half': {
                // Первая половина - первые три строки
                const firstHalf = rows.slice(0, 3)
                    .flat()
                    .map(num => parseInt(num.textContent.trim()))
                    .filter(num => !isNaN(num));

                // Вторая половина - последние три строки
                const secondHalf = rows.slice(3)
                    .flat()
                    .map(num => parseInt(num.textContent.trim()))
                    .filter(num => !isNaN(num));

                console.log('Числа в первой половине:', firstHalf);
                console.log('Числа во второй половине:', secondHalf);

                // Проверяем, все ли указанные числа находятся в первой половине
                const allInFirstHalf = numbers.every(num => firstHalf.includes(parseInt(num)));
                // Проверяем, все ли указанные числа находятся во второй половине
                const allInSecondHalf = numbers.every(num => secondHalf.includes(parseInt(num)));

                if (allInFirstHalf) console.log('✅ Все числа найдены в первой половине!');
                if (allInSecondHalf) console.log('✅ Все числа найдены во второй половине!');

                return allInFirstHalf || allInSecondHalf;
            }
            case 'anywhere': {
                const allFound = numbers.every(num => ticketNumbers.includes(parseInt(num)));
                if (allFound) console.log('✅ Все числа найдены в билете!');
                return allFound;
            }
            default:
                console.error('Неизвестный режим поиска:', searchMode);
                return false;
        }
    }// Функция для поиска подходящего билета
async function findSuitableTicket(numbers) {
    while (isSearching) {
        // Ищем все билеты
        const tickets = document.querySelectorAll('button[class*="Ticket_btn"]');
        console.log(`\nАнализируем ${tickets.length} билетов...`);
        let foundTicketsOnPage = [];
        
        // Сначала проверяем все билеты на странице
        for (const ticket of tickets) {
            if (!isSearching) return false;
            ticketsChecked++;
            
            // В режиме покупки обновляем счетчик просмотренных билетов
            if (isPurchaseMode) {
                purchaseTicketsChecked = ticketsChecked;
                purchaseStartTime = searchStartTime;
            }
            
            updateStatusBlock(numbers, excludeNumbers, mode);
            
            if (analyzeTicket(ticket, numbers)) {
                const ticketNumber = ticket.querySelector('[data-test-id="ticket-number"]')?.textContent || 'неизвестен';
                console.log('🎯 Найден подходящий билет:', ticketNumber);
                foundTicketsOnPage.push(ticket);
                
                // Если в режиме покупки и уже достигли лимита, прекращаем поиск
                if (isPurchaseMode && foundTicketsOnPage.length + ticketsPurchased >= totalTicketsToBuy) {
                    break;
                }
            }
        }

        // Если нашли подходящие билеты, нажимаем на них
        if (foundTicketsOnPage.length > 0) {
            console.log(`Найдено ${foundTicketsOnPage.length} подходящих билетов на странице`);
            
            // Если в режиме покупки, берем только нужное количество билетов
            if (isPurchaseMode) {
                const ticketsToTake = Math.min(foundTicketsOnPage.length, totalTicketsToBuy - ticketsPurchased);
                foundTicketsOnPage = foundTicketsOnPage.slice(0, ticketsToTake);
                console.log(`В режиме покупки выбираем ${ticketsToTake} билетов`);
            }
            
            // Нажимаем на каждый найденный билет
            for (const ticket of foundTicketsOnPage) {
                if (!isSearching) return false;
                
                const ticketNumber = ticket.querySelector('[data-test-id="ticket-number"]')?.textContent || 'неизвестен';
                console.log('Выбираем билет:', ticketNumber);
                ticket.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // В режиме покупки проверяем наличие кнопок оплаты
            if (isPurchaseMode) {
                const paymentStatus = checkPaymentButtons();
                
                if (paymentStatus.walletPaymentAvailable || paymentStatus.qrPaymentAvailable) {
                    console.log('✅ Обнаружены кнопки оплаты:', paymentStatus);
                    
                    // Увеличиваем счетчик купленных билетов
                    ticketsPurchased += foundTicketsOnPage.length;
                    
                    // Обновляем информацию о просмотренных билетах и времени поиска
                    purchaseTicketsChecked = ticketsChecked;
                    purchaseStartTime = searchStartTime;
                    
                    // Обновляем статус
                    updateStatusBlock(numbers, excludeNumbers, mode);
                    
                    // Сохраняем состояние покупки
                    await savePurchaseState();
                      // Проверяем, достигли ли мы лимита покупок
                    if (ticketsPurchased >= totalTicketsToBuy) {
                        console.log('✅ Достигнут лимит покупок:', ticketsPurchased);
                        
                        // Обновляем текст блока состояния
                        const statusEl = document.getElementById('rusloto-status');
                        if (statusEl) {
                            const timeSpent = formatSearchTime();
                            statusEl.textContent = `Тестовая покупка завершена!\nКуплено билетов: ${ticketsPurchased} из ${totalTicketsToBuy}\nПроверено: ${ticketsChecked}, время: ${timeSpent}`;
                            statusEl.style.background = '#28a745'; // зеленый только при завершении
                        }
                        
                        // Сбрасываем состояние покупки, т.к. мы завершили задачу
                        await resetPurchaseState();
                        
                        // Завершаем поиск
                        return true;
                    } else {
                        console.log('⏳ Нужно купить еще билетов:', totalTicketsToBuy - ticketsPurchased);
                        
                        // Перезагружаем страницу для продолжения покупки
                        window.location.reload();
                        return true;
                    }
                } else {
                    console.log('❌ Кнопки оплаты не найдены, продолжаем поиск');
                }
            } else {                // Обычный режим - обновляем статус после выбора всех билетов
                let statusEl = document.getElementById('rusloto-status');
                if (statusEl) {
                    const timeSpent = formatSearchTime();
                    statusEl.textContent = foundTicketsOnPage.length === 1
                        ? `Поиск завершён! Найден подходящий билет.\nПроверено билетов: ${ticketsChecked}, время: ${timeSpent}`
                        : `Поиск завершён! Найдено билетов: ${foundTicketsOnPage.length}.\nПроверено: ${ticketsChecked}, время: ${timeSpent}`;
                    statusEl.style.background = '#28a745'; // зеленый цвет только при полном завершении поиска
                }

                console.log('✅ Поиск успешно завершен');
                return true;
            }
        }
          if (!isSearching) return false;
        
        console.log('❌ Подходящий билет не найден на этой странице');
        
        const otherTicketsButton = Array.from(document.querySelectorAll('button')).find(
            btn => btn.textContent.trim() === 'Другие билеты'
        );
        
        if (otherTicketsButton) {
            console.log('Пробуем другие билеты...');
            
            // В режиме покупки обновляем и сохраняем состояние перед нажатием на кнопку
            if (isPurchaseMode) {
                purchaseTicketsChecked = ticketsChecked;
                purchaseStartTime = searchStartTime;
                await savePurchaseState();
            }
            
            otherTicketsButton.click();
            await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
            console.log('Кнопка "Другие билеты" не найдена');
            
            // В режиме покупки, если еще не достигли лимита, перезагружаем страницу
            if (isPurchaseMode && ticketsPurchased < totalTicketsToBuy) {
                console.log('Перезагружаем страницу для продолжения поиска билетов...');
                
                // Сохраняем состояние перед перезагрузкой
                purchaseTicketsChecked = ticketsChecked;
                purchaseStartTime = searchStartTime;
                await savePurchaseState();
                
                window.location.reload();
                return true;
            }
            
            break;
        }
    }
    
    if (!isPurchaseMode) {
        removeStatusBlock();
    }
    return false;
}// Запускаем процесс
    const numbersSelected = await selectNumbers();
    if (numbersSelected && isSearching) {
        await findSuitableTicket(numbers);
    }
}

// Загружаем состояние покупки при загрузке страницы
loadPurchaseState();

// Сохраняем статус авторизации при загрузке страницы
saveAuthStatus();

// Слушаем сообщения от popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Получено сообщение:', request);
    if (request.action === 'clickNumbers') {
        // Проверяем, требуется ли авторизация для режима покупки
        const needsAuth = request.isPurchaseMode;
        
        // Если режим покупки и пользователь не авторизован
        if (needsAuth && !isUserLoggedIn()) {
            console.log('❌ Пользователь не авторизован для использования режима покупки');
            showAuthWarning();
            // Сохраняем текущий статус авторизации
            saveAuthStatus();
            sendResponse({
                status: 'error', 
                message: 'Для использования тестового режима покупки необходимо авторизоваться на сайте Столото'
            });
            return true;
        }
        
        // Устанавливаем параметры тестового режима покупки
        isPurchaseMode = request.isPurchaseMode || false;
        totalTicketsToBuy = request.ticketsToBuy || 0;
        purchaseSearchNumbers = request.numbers;
        purchaseExcludeNumbers = request.excludeNumbers || [];
        purchaseSearchMode = request.mode;
        
        // Если режим покупки активен и это новый запуск, сбрасываем счетчики
        if (isPurchaseMode) {
            // Если запускаем новую сессию покупки, сбрасываем счетчики
            ticketsPurchased = 0;
            purchaseTicketsChecked = 0;
            purchaseStartTime = Date.now();
            savePurchaseState();
        }
        
        // Сначала очищаем предыдущий выбор
        clearSelection().then(() => {
            clickNumbers(request.numbers, request.mode, request.excludeNumbers || []);
            sendResponse({status: 'success'});
        });
        return true;
    } else if (request.action === 'stopSearch') {
        console.log('Останавливаем поиск и обновляем страницу...');
        isSearching = false;
        searchStartTime = null;
        removeStatusBlock();
        
        // Если был активен режим покупки, сбрасываем его
        if (isPurchaseMode) {
            resetPurchaseState();
        }
        
        // Сначала очищаем выбранные числа
        clearSelection().then(() => {
            sendResponse({status: 'stopped'});
            setTimeout(() => window.location.reload(), 100);
        });
        return true;    } else if (request.action === 'checkUserLogin') {
        // Проверяем, авторизован ли пользователь
        const isLoggedIn = isUserLoggedIn();
        console.log('Проверка авторизации пользователя (checkUserLogin):', isLoggedIn);
        
        // Дополнительная информация для отладки
        const profileMenu = document.querySelector('[data-test-id="profile-menu"], .profile-menu, .user-profile');
        const userAvatar = document.querySelector('.user-avatar, .account-avatar, [data-test-id="user-avatar"]');
        console.log('Найдены элементы авторизации:', { 
            profileMenu: profileMenu ? true : false, 
            userAvatar: userAvatar ? true : false 
        });
        
        // Сохраняем статус авторизации
        saveAuthStatus();
        sendResponse({
            isLoggedIn: isLoggedIn
        });
        return true;
    } else if (request.action === 'checkUserBalance') {
        // Проверяем баланс пользователя для заданного количества билетов
        const ticketsToBuy = request.ticketsToBuy || 1;
        const userBalance = getUserBalance();
        const hasEnough = hasEnoughFunds(ticketsToBuy);
        
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

// Сохраняем статус авторизации пользователя
async function saveAuthStatus() {
    const isLoggedIn = isUserLoggedIn();
    
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

// Функция для получения баланса пользователя
function getUserBalance() {
    // Проверяем, авторизован ли пользователь
    if (!isUserLoggedIn()) {
        console.log('Невозможно получить баланс: пользователь не авторизован');
        return 0;
    }
    
    console.log('Начинаем поиск баланса пользователя...');
    
    // Метод 1: Поиск баланса в указанном формате (Account_balance)
    const accountBalanceElement = document.querySelector('.Account_balance__pONDE, .Account_accountLink__Hi6eY span');
    if (accountBalanceElement) {
        console.log('Найден элемент баланса аккаунта:', accountBalanceElement.textContent);
        const text = accountBalanceElement.textContent.trim();
        const matches = text.match(/(\d+([.,]\d+)?)/);
        if (matches) {
            const balanceValue = parseFloat(matches[1].replace(',', '.'));
            console.log('Баланс из элемента аккаунта:', balanceValue);
            return balanceValue;
        }
    }
    
    // Метод 2: Поиск по ссылке на кошелек с балансом
    const walletLinks = Array.from(document.querySelectorAll('a[href*="wallet"], a[href*="personal"]'));
    for (const link of walletLinks) {
        console.log('Проверка ссылки на кошелек:', link.textContent);
        if (link.textContent.includes('₽') || link.textContent.includes('руб')) {
            const text = link.textContent.trim();
            const matches = text.match(/(\d+([.,]\d+)?)/);
            if (matches) {
                const balanceValue = parseFloat(matches[1].replace(',', '.'));
                console.log('Баланс из ссылки на кошелек:', balanceValue);
                return balanceValue;
            }
        }
    }
    
    // Метод 3: Ищем элементы, которые могут содержать информацию о балансе
    const balanceElements = Array.from(document.querySelectorAll('.user-balance, .balance, .wallet-balance, [data-test-id="user-balance"]'));
    
    // Ищем также в блоке профиля пользователя
    const profileElements = Array.from(document.querySelectorAll('.profile-menu, .user-profile, .account-info'));
    
    let balanceText = '';
    
    // Сначала проверяем специальные элементы баланса
    for (const element of balanceElements) {
        console.log('Проверка элемента баланса:', element.textContent);
        balanceText = element.textContent.trim();
        if (balanceText) break;
    }
    
    // Если баланс не найден, проверяем в блоке профиля
    if (!balanceText) {
        for (const element of profileElements) {
            // Ищем числа в тексте элемента, которые могут быть балансом
            const text = element.textContent.trim();
            console.log('Проверка элемента профиля:', text);
            const matches = text.match(/\d+([.,]\d+)?/);
            if (matches) {
                balanceText = matches[0];
                break;
            }
        }
    }
      // Если баланс все еще не найден, ищем в любых элементах, содержащих цифры рядом с "₽" или "руб"
    if (!balanceText) {
        console.log('Поиск баланса по всем элементам страницы с символом валюты...');
        // Метод 4: Поиск по всем span, содержащим символ валюты
        const currencySpans = Array.from(document.querySelectorAll('span, div, a')).filter(
            el => el.textContent && (
                el.textContent.includes('₽') || 
                el.textContent.includes('руб') || 
                el.textContent.includes('Р') || 
                el.textContent.includes('р.')
            )
        );
        
        for (const span of currencySpans) {
            console.log('Проверка элемента с валютой:', span.textContent);
            const text = span.textContent.trim();
            const matches = text.match(/(\d+([.,]\d+)?)\s*(₽|руб|Р|р\.)/);
            if (matches) {
                balanceText = matches[1];
                console.log('Найден баланс в элементе с валютой:', balanceText);
                break;
            }
        }
        
        // Метод 5: Общий поиск по всем элементам страницы
        if (!balanceText) {
            const anyElements = Array.from(document.querySelectorAll('*'));
            for (const element of anyElements) {
                if (element.childNodes.length === 0 || element.tagName === 'SPAN' || element.tagName === 'A') {
                    const text = element.textContent.trim();
                    // Ищем цифры рядом с символом валюты
                    const matches = text.match(/(\d+([.,]\d+)?)\s*(₽|руб|Р|р\.)/);
                    if (matches) {
                        balanceText = matches[1];
                        console.log('Найден баланс в общем поиске:', balanceText, 'в элементе:', element.tagName);
                        break;
                    }
                }
            }
        }
    }
    
    console.log('Итоговый найденный текст баланса:', balanceText);
    
    // Преобразуем текст в число
    if (balanceText) {
        // Заменяем запятую на точку для корректного преобразования
        balanceText = balanceText.replace(',', '.');
        // Извлекаем только цифры и точку
        const balanceValue = parseFloat(balanceText.replace(/[^\d.]/g, ''));
        console.log('Баланс пользователя:', balanceValue);
        return balanceValue || 0;
    }
    
    console.log('Не удалось найти баланс пользователя');
    return 0;
}

// Функция для проверки достаточности средств
function hasEnoughFunds(ticketsToBuy) {
    const ticketPrice = 150; // Стоимость одного билета
    const requiredAmount = ticketPrice * ticketsToBuy;
    const userBalance = getUserBalance();
    
    console.log(`Проверка средств: ${userBalance} руб. на счету, требуется ${requiredAmount} руб. для ${ticketsToBuy} билетов`);
    
    return userBalance >= requiredAmount;
}

// Функция для отображения предупреждения о недостатке средств
function showInsufficientFundsWarning(ticketsToBuy) {
    const ticketPrice = 150;
    const userBalance = getUserBalance();
    const requiredAmount = ticketPrice * ticketsToBuy;
    
    console.log(`Показываем предупреждение о недостатке средств. Баланс: ${userBalance}, Требуется: ${requiredAmount}`);
    
    let warningEl = document.getElementById('rusloto-funds-warning');
    if (!warningEl) {
        warningEl = document.createElement('div');
        warningEl.id = 'rusloto-funds-warning';
        warningEl.style.cssText = `
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            background: #dc3545;
            color: white;
            padding: 10px 20px;
            font-size: 16px;
            z-index: 10000;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        warningEl.textContent = `Недостаточно средств! Для покупки ${ticketsToBuy} билетов требуется ${requiredAmount} руб. На счету: ${userBalance} руб.`;
        document.body.appendChild(warningEl);
    } else {
        // Обновляем текст, если предупреждение уже существует
        warningEl.textContent = `Недостаточно средств! Для покупки ${ticketsToBuy} билетов требуется ${requiredAmount} руб. На счету: ${userBalance} руб.`;
        warningEl.style.display = 'block';
    }
    
    // Скрываем предупреждение через 7 секунд
    setTimeout(() => {
        if (warningEl && warningEl.parentNode) {
            warningEl.remove();
        }
    }, 7000);
}
