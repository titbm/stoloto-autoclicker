# Руководство по отладке и тестированию

## Обзор

Этот документ содержит процедуры устранения неполадок, техники отладки и методы тестирования для расширения "Столото Автокликер". Следование этим рекомендациям поможет быстро диагностировать и решать проблемы.

## Использование console.log для трассировки выполнения

### Структурированное логирование

Проект использует структурированный подход к логированию для отслеживания выполнения:

```javascript
// ✅ Логирование начала операции
console.log('Начинаем работу с числами:', numbers, 'исключая:', excludeNumbers, 'режим:', mode);

// ✅ Логирование состояния с объектом
console.log('Проверка авторизации:', { 
    'profileMenu': !!profileMenu, 
    'userAvatar': !!userAvatar,
    'userNameElement': !!userNameElement,
    'personalCabinetElement': !!personalCabinetElement
});

// ✅ Логирование с временными метками
console.log('Состояние покупки сохранено:', {
    ticketsPurchased,
    totalTicketsToBuy,
    purchaseStartTime: purchaseStartTime ? new Date(purchaseStartTime).toLocaleTimeString() : null
});
```

### Ключевые точки логирования

#### 1. Инициализация и загрузка
```javascript
// popup.js
console.log('Инициализация popup...');
console.log('Статус авторизации из хранилища (свежий):', isUserAuthenticated);

// content.js
console.log('Столото Автокликер: content script загружен');
console.log('Загружено состояние покупки:', {
    isPurchaseMode,
    totalTicketsToBuy,
    ticketsPurchased
});
```

#### 2. Операции с DOM
```javascript
console.log('Нажимаем на число:', num);
console.log('Анализ билета:', ticketNumber);
console.log('Числа в билете:', ticketNumbers);
console.log('✅ Все числа найдены в первой половине!');
console.log('❌ В билете найдены исключаемые числа');
```

#### 3. Состояние поиска и покупки
```javascript
console.log(`Найдено ${foundTicketsOnPage.length} подходящих билетов на странице`);
console.log('✅ Достигнут лимит покупок:', ticketsPurchased);
console.log('⏳ Нужно купить еще билетов:', totalTicketsToBuy - ticketsPurchased);
```

#### 4. Ошибки и предупреждения
```javascript
console.error('Ошибка при проверке авторизации:', error);
console.log('❌ Пользователь не авторизован, но пытается включить режим покупки');
console.log('Таймаут при проверке баланса');
```

## Техники отладки Chrome DevTools для расширений

### Отладка popup.js

1. **Открытие DevTools для popup:**
   - Откройте расширение (нажмите на иконку)
   - Щелкните правой кнопкой мыши на popup
   - Выберите "Проверить элемент" или "Inspect"

2. **Основные техники:**
   ```javascript
   // Установка точек останова в коде
   debugger; // Принудительная остановка выполнения
   
   // Проверка состояния переменных
   console.log('Current auth status:', isUserAuthenticated);
   console.log('Button state:', button.disabled, button.textContent);
   
   // Отслеживание событий
   button.addEventListener('click', (e) => {
       console.log('Button clicked, event:', e);
       debugger; // Остановка для анализа
   });
   ```

### Отладка content.js

1. **Открытие DevTools для content script:**
   - Откройте страницу Столото
   - Нажмите F12 или Ctrl+Shift+I
   - Перейдите на вкладку "Console"
   - Найдите сообщения от content script

2. **Отладка взаимодействия с DOM:**
   ```javascript
   // Проверка наличия элементов
   console.log('Buttons found:', document.querySelectorAll('button').length);
   console.log('Number buttons:', Array.from(document.querySelectorAll('button'))
       .filter(btn => /^\d+$/.test(btn.textContent.trim())));
   
   // Отладка селекторов
   const tickets = document.querySelectorAll('button[class*="Ticket_btn"]');
   console.log('Tickets found:', tickets.length);
   tickets.forEach((ticket, index) => {
       console.log(`Ticket ${index}:`, ticket.querySelector('[data-test-id="ticket-number"]')?.textContent);
   });
   ```

3. **Отладка состояния поиска:**
   ```javascript
   // Добавление отладочной информации в updateStatusBlock
   function updateStatusBlock(numbers, excludeNumbers, mode) {
       console.log('Updating status block:', {
           numbers,
           excludeNumbers,
           mode,
           ticketsChecked,
           isPurchaseMode,
           ticketsPurchased
       });
       
       // ... остальной код
   }
   ```

### Отладка event_page.js (Service Worker)

1. **Открытие DevTools для service worker:**
   - Перейдите в `chrome://extensions/`
   - Найдите расширение "Столото Автокликер"
   - Нажмите "Подробности"
   - Нажмите "Проверить представления: service worker"

2. **Отладка обработчиков событий:**
   ```javascript
   chrome.action.onClicked.addListener(async (tab) => {
       console.log('Extension icon clicked, tab:', tab.url);
       
       const workPageUrl = 'https://www.stoloto.ru/ruslotto/game?viewType=favorite';
       
       if (tab.url === workPageUrl) {
           console.log('Already on work page, opening popup');
       } else {
           console.log('Creating new tab with work page');
       }
   });
   ```

## Процедуры тестирования для различных сценариев

### Тестирование основных функций

#### 1. Тестирование поиска билетов

**Сценарий: Поиск в режиме "половина"**
```javascript
// Тестовые данные
const testNumbers = [1, 5, 10, 15, 20];
const testMode = 'half';

// Процедура тестирования
async function testHalfModeSearch() {
    console.log('=== Тестирование поиска в режиме "половина" ===');
    
    // 1. Очистка предыдущего выбора
    await clearSelection();
    console.log('✓ Выбор очищен');
    
    // 2. Выбор чисел
    for (const num of testNumbers) {
        const button = Array.from(document.querySelectorAll('button'))
            .find(btn => btn.textContent.trim() === num.toString());
        
        if (button) {
            button.click();
            console.log(`✓ Выбрано число: ${num}`);
        } else {
            console.error(`✗ Не найдена кнопка для числа: ${num}`);
        }
    }
    
    // 3. Показ билетов
    const showButton = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent.trim() === 'Показать билеты');
    
    if (showButton) {
        showButton.click();
        console.log('✓ Нажата кнопка "Показать билеты"');
        
        // Ждем загрузки
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 4. Анализ результатов
        const tickets = document.querySelectorAll('button[class*="Ticket_btn"]');
        console.log(`✓ Найдено билетов для анализа: ${tickets.length}`);
        
        let suitableTickets = 0;
        tickets.forEach((ticket, index) => {
            if (analyzeTicket(ticket, testNumbers)) {
                suitableTickets++;
                console.log(`✓ Билет ${index + 1} подходит`);
            }
        });
        
        console.log(`=== Результат: найдено ${suitableTickets} подходящих билетов ===`);
    } else {
        console.error('✗ Не найдена кнопка "Показать билеты"');
    }
}
```

**Сценарий: Тестирование исключения чисел**
```javascript
async function testExcludeNumbers() {
    console.log('=== Тестирование исключения чисел ===');
    
    const searchNumbers = [1, 5, 10];
    const excludeNumbers = [7, 13, 25];
    
    // Запуск поиска с исключениями
    await clickNumbers(searchNumbers, 'anywhere', excludeNumbers);
    
    // Проверка что билеты не содержат исключаемые числа
    const tickets = document.querySelectorAll('button[class*="Ticket_btn"]');
    
    tickets.forEach((ticket, index) => {
        const ticketNumbers = Array.from(ticket.querySelectorAll('[data-test-id="number"], [data-test-id="selected-number"]'))
            .map(num => parseInt(num.textContent.trim()))
            .filter(num => !isNaN(num));
        
        const hasExcluded = excludeNumbers.some(num => ticketNumbers.includes(num));
        
        if (hasExcluded) {
            console.error(`✗ Билет ${index + 1} содержит исключаемые числа:`, 
                excludeNumbers.filter(num => ticketNumbers.includes(num)));
        } else {
            console.log(`✓ Билет ${index + 1} не содержит исключаемых чисел`);
        }
    });
}
```

#### 2. Тестирование режима покупки

**Сценарий: Тестирование автоматической покупки**
```javascript
async function testPurchaseMode() {
    console.log('=== Тестирование режима покупки ===');
    
    // 1. Проверка авторизации
    const isLoggedIn = isUserLoggedIn();
    console.log('Статус авторизации:', isLoggedIn);
    
    if (!isLoggedIn) {
        console.error('✗ Пользователь не авторизован, тест невозможен');
        return;
    }
    
    // 2. Проверка баланса
    const balanceLink = document.querySelector('a[href="/private/wallet?int=header"]');
    if (balanceLink) {
        const balanceText = balanceLink.textContent.trim();
        console.log('Текущий баланс:', balanceText);
        
        const match = balanceText.match(/(\d+(?:\s\d+)*)\s*₽/);
        const balance = match ? parseInt(match[1].replace(/\s/g, '')) : 0;
        
        const requiredAmount = 150 * 2; // Тестируем покупку 2 билетов
        
        if (balance >= requiredAmount) {
            console.log(`✓ Достаточно средств для покупки (${balance} >= ${requiredAmount})`);
        } else {
            console.warn(`⚠ Недостаточно средств (${balance} < ${requiredAmount})`);
        }
    }
    
    // 3. Установка параметров покупки
    isPurchaseMode = true;
    totalTicketsToBuy = 2;
    ticketsPurchased = 0;
    
    console.log('✓ Режим покупки активирован');
    console.log('Параметры:', { totalTicketsToBuy, ticketsPurchased });
    
    // 4. Запуск поиска
    await clickNumbers([1, 5, 10, 15, 20], 'half', []);
}
```

### Тестирование граничных случаев

#### 1. Тестирование с некорректными данными

```javascript
function testInvalidInputs() {
    console.log('=== Тестирование некорректных входных данных ===');
    
    // Тест парсинга чисел
    const testCases = [
        { input: '', expected: [] },
        { input: '1,2,3', expected: ['1', '2', '3'] },
        { input: '1, 2, 3', expected: ['1', '2', '3'] },
        { input: '0,91,abc,5', expected: ['5'] }, // Только валидные числа
        { input: '1,1,2,2,3', expected: ['1', '1', '2', '2', '3'] }, // Дубликаты разрешены
    ];
    
    testCases.forEach(({ input, expected }, index) => {
        const result = parseNumbers(input);
        const passed = JSON.stringify(result) === JSON.stringify(expected);
        
        console.log(`Тест ${index + 1}: ${passed ? '✓' : '✗'}`);
        console.log(`  Ввод: "${input}"`);
        console.log(`  Ожидается: [${expected.join(', ')}]`);
        console.log(`  Получено: [${result.join(', ')}]`);
        
        if (!passed) {
            console.error(`  ✗ Тест провален!`);
        }
    });
}
```

#### 2. Тестирование состояния гонки

```javascript
async function testRaceConditions() {
    console.log('=== Тестирование состояния гонки ===');
    
    // Быстрые повторные нажатия на кнопку
    const button = document.getElementById('startButton');
    
    console.log('Тестируем быстрые повторные нажатия...');
    
    // Имитируем быстрые клики
    for (let i = 0; i < 5; i++) {
        button.click();
        console.log(`Клик ${i + 1}, disabled: ${button.disabled}`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Проверяем что кнопка заблокирована
    if (button.disabled) {
        console.log('✓ Кнопка корректно заблокирована');
    } else {
        console.error('✗ Кнопка не заблокирована - возможно состояние гонки');
    }
}
```## 
Диагностика проблем аутентификации и состояния

### Проблемы с авторизацией

#### Диагностика статуса авторизации

```javascript
function diagnoseAuthStatus() {
    console.log('=== Диагностика статуса авторизации ===');
    
    // 1. Проверка всех методов определения авторизации
    const authChecks = {
        profileMenu: !!document.querySelector('[data-test-id="profile-menu"], .profile-menu, .user-profile'),
        userAvatar: !!document.querySelector('.user-avatar, .account-avatar, [data-test-id="user-avatar"]'),
        userNameElement: !!document.querySelector('.profile-name, .user-name, .account-name'),
        walletElement: !!document.querySelector('.user-balance, .wallet, [data-test-id="user-balance"]'),
        balanceLink: !!document.querySelector('a[href="/private/wallet?int=header"]'),
        bonusLink: !!document.querySelector('a[href="/private/bonus?int=header"]')
    };
    
    console.log('Результаты проверки авторизации:', authChecks);
    
    // 2. Проверка блоков входа/регистрации
    const loginElements = Array.from(document.querySelectorAll('div, a, button, span'));
    const authBlock = loginElements.find(el => {
        if (!el || !el.textContent) return false;
        const text = el.textContent.trim().toLowerCase();
        return text === 'вход и регистрация' || text === 'войти' || text === 'вход';
    });
    
    console.log('Блок входа найден:', !!authBlock);
    if (authBlock) {
        console.log('Текст блока входа:', authBlock.textContent.trim());
    }
    
    // 3. Итоговая оценка
    const positiveChecks = Object.values(authChecks).filter(Boolean).length;
    const hasLoginBlock = !!authBlock;
    
    console.log(`Положительных проверок: ${positiveChecks}/6`);
    console.log(`Блок входа присутствует: ${hasLoginBlock}`);
    
    const finalStatus = !hasLoginBlock && positiveChecks > 0;
    console.log(`Итоговый статус авторизации: ${finalStatus}`);
    
    return {
        isLoggedIn: finalStatus,
        checks: authChecks,
        hasLoginBlock,
        positiveChecks
    };
}
```

#### Проблемы с кэшированием статуса авторизации

```javascript
async function diagnoseAuthCache() {
    console.log('=== Диагностика кэша авторизации ===');
    
    // 1. Проверка данных в Chrome Storage
    const data = await chrome.storage.local.get('authStatus');
    
    if (data.authStatus) {
        const age = Date.now() - data.authStatus.timestamp;
        const ageSeconds = Math.floor(age / 1000);
        
        console.log('Данные авторизации в кэше:', {
            isLoggedIn: data.authStatus.isLoggedIn,
            timestamp: new Date(data.authStatus.timestamp).toLocaleString(),
            ageSeconds: ageSeconds,
            isRecent: ageSeconds < 10
        });
        
        if (ageSeconds > 10) {
            console.warn('⚠ Данные авторизации устарели');
        }
    } else {
        console.log('Данных авторизации в кэше нет');
    }
    
    // 2. Сравнение с текущим состоянием
    const currentStatus = diagnoseAuthStatus();
    
    if (data.authStatus && data.authStatus.isLoggedIn !== currentStatus.isLoggedIn) {
        console.error('✗ Расхождение между кэшем и текущим состоянием!');
        console.log('Кэш:', data.authStatus.isLoggedIn);
        console.log('Текущее:', currentStatus.isLoggedIn);
    } else {
        console.log('✓ Кэш соответствует текущему состоянию');
    }
}
```

### Проблемы с состоянием покупки

#### Диагностика состояния покупки

```javascript
async function diagnosePurchaseState() {
    console.log('=== Диагностика состояния покупки ===');
    
    // 1. Проверка переменных в памяти
    console.log('Переменные состояния в памяти:', {
        isPurchaseMode,
        totalTicketsToBuy,
        ticketsPurchased,
        purchaseSearchNumbers,
        purchaseExcludeNumbers,
        purchaseSearchMode,
        purchaseTicketsChecked,
        purchaseStartTime: purchaseStartTime ? new Date(purchaseStartTime).toLocaleString() : null
    });
    
    // 2. Проверка данных в Chrome Storage
    const data = await chrome.storage.local.get('purchaseState');
    
    if (data.purchaseState) {
        console.log('Состояние покупки в Storage:', {
            isPurchaseMode: data.purchaseState.isPurchaseMode,
            totalTicketsToBuy: data.purchaseState.totalTicketsToBuy,
            ticketsPurchased: data.purchaseState.ticketsPurchased,
            timestamp: new Date(data.purchaseState.timestamp).toLocaleString()
        });
        
        // Проверка консистентности
        const memoryState = {
            isPurchaseMode,
            totalTicketsToBuy,
            ticketsPurchased
        };
        
        const storageState = {
            isPurchaseMode: data.purchaseState.isPurchaseMode,
            totalTicketsToBuy: data.purchaseState.totalTicketsToBuy,
            ticketsPurchased: data.purchaseState.ticketsPurchased
        };
        
        const isConsistent = JSON.stringify(memoryState) === JSON.stringify(storageState);
        
        if (isConsistent) {
            console.log('✓ Состояние в памяти соответствует Storage');
        } else {
            console.error('✗ Расхождение между памятью и Storage!');
            console.log('Память:', memoryState);
            console.log('Storage:', storageState);
        }
    } else {
        console.log('Состояния покупки в Storage нет');
        
        if (isPurchaseMode) {
            console.warn('⚠ Режим покупки активен в памяти, но не сохранен в Storage');
        }
    }
    
    // 3. Проверка логической корректности
    if (isPurchaseMode) {
        if (totalTicketsToBuy <= 0) {
            console.error('✗ Режим покупки активен, но totalTicketsToBuy <= 0');
        }
        
        if (ticketsPurchased > totalTicketsToBuy) {
            console.error('✗ Куплено больше билетов чем планировалось');
        }
        
        if (purchaseSearchNumbers.length === 0) {
            console.error('✗ Режим покупки активен, но числа для поиска не заданы');
        }
    }
}
```

### Диагностика проблем с балансом

```javascript
function diagnoseBalanceIssues() {
    console.log('=== Диагностика проблем с балансом ===');
    
    // 1. Поиск элементов баланса
    const balanceLink = document.querySelector('a[href="/private/wallet?int=header"]');
    const bonusLink = document.querySelector('a[href="/private/bonus?int=header"]');
    
    console.log('Элементы найдены:', {
        balanceLink: !!balanceLink,
        bonusLink: !!bonusLink
    });
    
    if (balanceLink) {
        const balanceText = balanceLink.textContent.trim();
        console.log('Текст баланса:', balanceText);
        
        // Парсинг баланса
        const match = balanceText.match(/(\d+(?:\s\d+)*)\s*₽/);
        
        if (match) {
            const balance = parseInt(match[1].replace(/\s/g, ''));
            console.log('Распознанный баланс:', balance, 'руб.');
            
            // Проверка достаточности для покупки
            const ticketPrice = 150;
            const maxTickets = Math.floor(balance / ticketPrice);
            console.log(`Максимальное количество билетов: ${maxTickets}`);
            
        } else {
            console.error('✗ Не удалось распознать баланс из текста:', balanceText);
        }
    } else {
        console.error('✗ Элемент баланса не найден - пользователь не авторизован?');
    }
    
    if (bonusLink) {
        const bonusText = bonusLink.textContent.trim();
        console.log('Количество бонусов:', bonusText);
    }
}
```

## Общие паттерны ошибок и шаги разрешения

### 1. Ошибка "Расширение не работает на странице"

**Симптомы:**
- Popup открывается, но кнопка "Запустить" не работает
- В консоли ошибки типа "Could not establish connection"

**Диагностика:**
```javascript
// В popup.js добавить отладку
chrome.tabs.sendMessage(activeTab.id, {
    action: 'clickNumbers',
    numbers: numbers
}, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Connection error:', chrome.runtime.lastError.message);
        console.log('Tab URL:', activeTab.url);
        console.log('Tab ID:', activeTab.id);
    }
});
```

**Решение:**
1. Проверить что вы находитесь на странице Столото
2. Обновить страницу (F5)
3. Проверить что content script загружен: в консоли должно быть сообщение "Столото Автокликер: content script загружен"

### 2. Ошибка "Числа не выбираются"

**Симптомы:**
- Поиск запускается, но числа на странице не нажимаются
- В логах сообщения "Кнопка не найдена для числа: X"

**Диагностика:**
```javascript
// Проверка доступных кнопок с числами
const numberButtons = Array.from(document.querySelectorAll('button'))
    .filter(btn => /^\d+$/.test(btn.textContent.trim()));

console.log('Доступные кнопки с числами:', 
    numberButtons.map(btn => btn.textContent.trim()));

// Проверка конкретного числа
const targetNumber = 5;
const button = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.trim() === targetNumber.toString());

console.log(`Кнопка для числа ${targetNumber}:`, button);
```

**Решение:**
1. Убедиться что страница полностью загружена
2. Проверить что вы находитесь в правильном разделе сайта
3. Обновить селекторы если изменился интерфейс сайта

### 3. Ошибка "Билеты не анализируются"

**Симптомы:**
- Числа выбираются, кнопка "Показать билеты" нажимается
- Но анализ билетов не происходит или работает некорректно

**Диагностика:**
```javascript
// Проверка структуры билетов
const tickets = document.querySelectorAll('button[class*="Ticket_btn"]');
console.log('Найдено билетов:', tickets.length);

if (tickets.length > 0) {
    const firstTicket = tickets[0];
    console.log('Структура первого билета:');
    
    const numbers = firstTicket.querySelectorAll('[data-test-id="number"], [data-test-id="selected-number"]');
    console.log('Числа в билете:', numbers.length);
    
    numbers.forEach((num, index) => {
        console.log(`Число ${index + 1}:`, num.textContent.trim());
    });
    
    const ticketNumber = firstTicket.querySelector('[data-test-id="ticket-number"]');
    console.log('Номер билета:', ticketNumber?.textContent);
}
```

**Решение:**
1. Проверить что селекторы билетов актуальны
2. Убедиться что билеты загрузились (добавить задержку)
3. Проверить логику анализа билетов в функции `analyzeTicket`

### 4. Проблемы с режимом покупки

**Симптомы:**
- Режим покупки не активируется
- Покупка не происходит даже при найденных билетах
- Состояние покупки не сохраняется

**Диагностика:**
```javascript
// Полная диагностика режима покупки
async function fullPurchaseDiagnosis() {
    console.log('=== Полная диагностика режима покупки ===');
    
    // 1. Авторизация
    const authStatus = diagnoseAuthStatus();
    console.log('1. Авторизация:', authStatus.isLoggedIn);
    
    // 2. Баланс
    diagnoseBalanceIssues();
    
    // 3. Состояние покупки
    await diagnosePurchaseState();
    
    // 4. Кнопки оплаты
    const paymentButtons = checkPaymentButtons();
    console.log('4. Кнопки оплаты:', paymentButtons);
    
    // 5. Общая готовность
    const isReady = authStatus.isLoggedIn && 
                   (paymentButtons.walletPaymentAvailable || paymentButtons.qrPaymentAvailable);
    
    console.log('5. Готовность к покупке:', isReady);
    
    return {
        authStatus,
        paymentButtons,
        isReady
    };
}
```

**Решение:**
1. Убедиться что пользователь авторизован
2. Проверить достаточность баланса
3. Проверить наличие кнопок оплаты на странице
4. Очистить состояние покупки: `await resetPurchaseState()`

### 5. Проблемы с производительностью

**Симптомы:**
- Расширение работает медленно
- Браузер зависает при работе расширения
- Высокое потребление памяти

**Диагностика:**
```javascript
// Мониторинг производительности
function performanceMonitor() {
    const startTime = performance.now();
    
    // Ваш код здесь
    
    const endTime = performance.now();
    console.log(`Операция заняла ${endTime - startTime} миллисекунд`);
}

// Мониторинг памяти (только в Chrome DevTools)
console.log('Использование памяти:', performance.memory);
```

**Решение:**
1. Увеличить задержки между операциями
2. Оптимизировать селекторы DOM
3. Очищать неиспользуемые переменные
4. Использовать `requestAnimationFrame` для тяжелых операций

## Автоматизированное тестирование

### Создание тестового набора

```javascript
// Основной тестовый набор
async function runAllTests() {
    console.log('🧪 Запуск полного набора тестов...');
    
    const tests = [
        { name: 'Парсинг чисел', fn: testInvalidInputs },
        { name: 'Поиск в режиме "половина"', fn: testHalfModeSearch },
        { name: 'Исключение чисел', fn: testExcludeNumbers },
        { name: 'Диагностика авторизации', fn: diagnoseAuthStatus },
        { name: 'Диагностика баланса', fn: diagnoseBalanceIssues },
        { name: 'Состояние гонки', fn: testRaceConditions }
    ];
    
    const results = [];
    
    for (const test of tests) {
        console.log(`\n--- Выполнение теста: ${test.name} ---`);
        
        try {
            const startTime = performance.now();
            await test.fn();
            const duration = performance.now() - startTime;
            
            results.push({
                name: test.name,
                status: 'PASSED',
                duration: Math.round(duration)
            });
            
            console.log(`✅ ${test.name} - PASSED (${Math.round(duration)}ms)`);
        } catch (error) {
            results.push({
                name: test.name,
                status: 'FAILED',
                error: error.message
            });
            
            console.error(`❌ ${test.name} - FAILED:`, error);
        }
    }
    
    // Итоговый отчет
    console.log('\n📊 Итоговый отчет тестирования:');
    console.table(results);
    
    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    
    console.log(`\n✅ Пройдено: ${passed}`);
    console.log(`❌ Провалено: ${failed}`);
    console.log(`📈 Успешность: ${Math.round(passed / results.length * 100)}%`);
}

// Запуск тестов
// runAllTests();
```

## Заключение

Это руководство предоставляет комплексный подход к отладке и тестированию расширения "Столото Автокликер". Регулярное использование этих техник поможет:

1. **Быстро диагностировать проблемы** с помощью структурированного логирования
2. **Эффективно отлаживать код** используя Chrome DevTools
3. **Тестировать различные сценарии** для обеспечения надежности
4. **Решать типичные проблемы** следуя проверенным процедурам

При возникновении новых проблем рекомендуется:
- Добавлять новые диагностические функции
- Расширять набор тестов
- Документировать найденные решения
- Обновлять это руководство