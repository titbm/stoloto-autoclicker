# Справочник Chrome APIs

## Введение

Расширение "Столото Автокликер" использует несколько ключевых Chrome APIs для обеспечения своей функциональности. Этот документ содержит подробное описание каждого используемого API, практические примеры и руководство по устранению неполадок.

## Используемые Chrome APIs

### 1. chrome.storage.local

**Назначение**: Локальное хранение данных расширения между сессиями.

**Права доступа**: `"storage"` в manifest.json

#### Основные методы

##### chrome.storage.local.set()

Сохранение данных в локальное хранилище.

```javascript
// Сохранение параметров поиска
await chrome.storage.local.set({
    lastSearch: {
        numbers: [1, 5, 12, 23, 34],
        excludeNumbers: [7, 14, 21],
        mode: 'half',
        isPurchaseMode: true,
        ticketsToBuy: 3,
        timestamp: Date.now()
    }
});

// Сохранение состояния покупки
await chrome.storage.local.set({
    purchaseState: {
        isPurchaseMode: true,
        totalTicketsToBuy: 5,
        ticketsPurchased: 2,
        purchaseSearchNumbers: [1, 5, 12, 23, 34],
        purchaseExcludeNumbers: [7, 14, 21],
        purchaseSearchMode: 'half',
        purchaseTicketsChecked: 150,
        purchaseStartTime: 1640995200000,
        timestamp: Date.now()
    }
});

// Сохранение статуса авторизации
await chrome.storage.local.set({
    authStatus: {
        isLoggedIn: true,
        timestamp: Date.now()
    }
});
```

##### chrome.storage.local.get()

Получение данных из локального хранилища.

```javascript
// Получение одного объекта
const data = await chrome.storage.local.get('lastSearch');
if (data.lastSearch) {
    console.log('Последний поиск:', data.lastSearch);
}

// Получение нескольких объектов
const data = await chrome.storage.local.get(['lastSearch', 'purchaseState', 'authStatus']);
console.log('Все данные:', data);

// Получение всех данных
const allData = await chrome.storage.local.get();
console.log('Все сохраненные данные:', allData);
```

##### chrome.storage.local.remove()

Удаление данных из хранилища.

```javascript
// Удаление одного ключа
await chrome.storage.local.remove('purchaseState');

// Удаление нескольких ключей
await chrome.storage.local.remove(['lastSearch', 'authStatus']);

// Очистка всего хранилища
await chrome.storage.local.clear();
```

#### Практические примеры использования

**Сохранение и восстановление состояния поиска**:

```javascript
// В popup.js - сохранение параметров поиска
async function saveSearchParams(numbers, excludeNumbers, mode, isPurchaseMode, ticketsToBuy) {
    try {
        await chrome.storage.local.set({
            lastSearch: {
                numbers: numbers,
                excludeNumbers: excludeNumbers,
                mode: mode,
                isPurchaseMode: isPurchaseMode,
                ticketsToBuy: ticketsToBuy,
                timestamp: Date.now()
            }
        });
        console.log('Параметры поиска сохранены');
    } catch (error) {
        console.error('Ошибка сохранения параметров:', error);
    }
}

// В popup.js - загрузка последних параметров поиска
async function loadLastSearchParams() {
    try {
        const data = await chrome.storage.local.get('lastSearch');
        if (data.lastSearch) {
            // Восстанавливаем базовые настройки
            numbersInput.value = data.lastSearch.numbers.join(', ');
            excludeNumbersInput.value = data.lastSearch.excludeNumbers.join(', ');
            searchMode.value = data.lastSearch.mode;
            
            // Проверяем текущий статус авторизации еще раз
            const currentAuthStatus = await checkAuthFromStorage();
            
            // Восстанавливаем настройки режима покупки только если пользователь авторизован
            if (data.lastSearch.isPurchaseMode && currentAuthStatus) {
                console.log('Восстанавливаем настройки режима покупки, пользователь авторизован');
                testPurchaseModeCheckbox.checked = true;
                purchaseOptionsContainer.style.display = 'block';
                ticketsToBuyInput.value = data.lastSearch.ticketsToBuy || 1;
            } else if (data.lastSearch.isPurchaseMode && !currentAuthStatus) {
                console.log('Режим покупки был активен, но пользователь не авторизован');
                testPurchaseModeCheckbox.checked = false;
                purchaseOptionsContainer.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки параметров:', error);
    }
}

// В state.js - сохранение состояния покупки
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
        purchaseTicketsChecked: state.purchaseTicketsChecked
    });
}

// В state.js - загрузка состояния покупки
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
            
            // Проверяем авторизацию перед продолжением режима покупки
            if (state.isPurchaseMode && !window.stolotoAuth.isUserLoggedIn()) {
                console.log('❌ Пользователь вышел из аккаунта, отменяем режим покупки');
                window.stolotoUI.showAuthWarning();
                await resetPurchaseState();
                return;
            }
            
            // Если покупка еще не завершена, продолжаем поиск
            if (state.isPurchaseMode && state.ticketsPurchased < state.totalTicketsToBuy) {
                console.log('Продолжаем покупку билетов, осталось купить:', 
                           state.totalTicketsToBuy - state.ticketsPurchased);
                
                // Восстанавливаем счетчик просмотренных билетов и время поиска
                state.ticketsChecked = state.purchaseTicketsChecked;
                state.searchStartTime = state.purchaseStartTime;
                
                // Обновляем блок статуса
                window.stolotoUI.updateStatusBlock(
                    state.purchaseSearchNumbers, 
                    state.purchaseExcludeNumbers, 
                    state.purchaseSearchMode
                );
                
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
```

**Отслеживание изменений в хранилище**:

```javascript
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
            console.log(`Storage key "${key}" changed:`, { oldValue, newValue });
            
            // Реакция на изменение статуса авторизации
            if (key === 'authStatus') {
                updateAuthDependentUI();
            }
            
            // Реакция на изменение состояния покупки
            if (key === 'purchaseState') {
                updatePurchaseStatus(newValue);
            }
        }
    }
});
```

### 2. chrome.tabs

**Назначение**: Управление вкладками браузера и взаимодействие с ними.

**Права доступа**: `"tabs"` в manifest.json

#### Основные методы

##### chrome.tabs.query()

Поиск вкладок по заданным критериям.

```javascript
// Получение активной вкладки в текущем окне
const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
if (tabs && tabs.length > 0) {
    const activeTab = tabs[0];
    console.log('Активная вкладка:', activeTab.url);
}

// Поиск всех вкладок со Столото
const stolotoTabs = await chrome.tabs.query({ url: '*://www.stoloto.ru/*' });
console.log('Найдено вкладок со Столото:', stolotoTabs.length);

// Поиск вкладок в текущем окне
const currentWindowTabs = await chrome.tabs.query({ currentWindow: true });
console.log('Вкладки в текущем окне:', currentWindowTabs.length);
```

##### chrome.tabs.sendMessage()

Отправка сообщений в content script на указанной вкладке. Все сообщения обрабатываются через `setupMessageListener()` в main.js.

```javascript
// Отправка команды поиска (из popup.js)
chrome.tabs.sendMessage(activeTab.id, {
    action: 'clickNumbers',
    numbers: numbers,
    excludeNumbers: filteredExcludeNumbers,
    mode: searchMode.value,
    isPurchaseMode: isPurchaseMode,
    ticketsToBuy: ticketsToBuy
}, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Ошибка:', chrome.runtime.lastError);
        alert('Ошибка: убедитесь, что вы находитесь на странице Столото');
        button.disabled = false;
    } else if (response && response.status === 'error') {
        console.error('Ошибка:', response.message);
        alert(response.message);
        button.disabled = false;
    } else {
        console.log('Начат поиск билета');
        isSearching = true;
        button.textContent = 'Остановить';
        button.classList.remove('start');
        button.classList.add('stop');
        button.disabled = false;
    }
});

// Проверка авторизации пользователя (из popup.js)
chrome.tabs.sendMessage(tab.id, { action: 'checkUserLogin' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Ошибка при проверке авторизации:', chrome.runtime.lastError);
        resolve(false);
        return;
    }
    
    if (response && response.isLoggedIn !== undefined) {
        isUserAuthenticated = response.isLoggedIn;
        console.log('Получен статус авторизации от страницы:', isUserAuthenticated);
        
        // Сохраняем полученный статус в хранилище
        chrome.storage.local.set({
            authStatus: {
                isLoggedIn: isUserAuthenticated,
                timestamp: Date.now()
            }
        });
        
        resolve(isUserAuthenticated);
    } else {
        console.log('Некорректный ответ от content script:', response);
        resolve(false);
    }
});

// Проверка баланса пользователя (из popup.js)
chrome.tabs.sendMessage(tab.id, { 
    action: 'checkUserBalance', 
    ticketsToBuy: ticketsToBuy 
}, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Ошибка при проверке баланса:', chrome.runtime.lastError);
        resolve({ hasEnoughFunds: false, balance: 0 });
        return;
    }
    
    if (response && response.balance !== undefined) {
        console.log('Получен баланс:', response.balance, 'руб.');
        console.log('Требуется:', ticketsToBuy * TICKET_PRICE, 'руб.');
        resolve({ 
            hasEnoughFunds: response.hasEnoughFunds, 
            balance: response.balance 
        });
    } else {
        console.log('Некорректный ответ при проверке баланса:', response);
        resolve({ hasEnoughFunds: false, balance: 0 });
    }
});

// Остановка поиска (из popup.js)
chrome.tabs.sendMessage(tab.id, { action: 'stopSearch' }, () => {
    isSearching = false;
    button.textContent = 'Запустить';
    button.classList.remove('stop');
    button.classList.add('start');
    button.disabled = false;
});
```

##### chrome.tabs.create()

Создание новых вкладок.

```javascript
// Открытие рабочей страницы Столото
const workPageUrl = 'https://www.stoloto.ru/ruslotto/game?viewType=favorite';
const newTab = await chrome.tabs.create({ 
    url: workPageUrl,
    active: true  // Делаем новую вкладку активной
});

console.log('Создана новая вкладка:', newTab.id);
```

#### Практические примеры использования

**Проверка и переключение на рабочую страницу**:

```javascript
async function ensureWorkingPage() {
    const workPageUrl = 'https://www.stoloto.ru/ruslotto/game?viewType=favorite';
    
    // Проверяем активную вкладку
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs && tabs.length > 0 && tabs[0].url === workPageUrl) {
        console.log('Пользователь уже на рабочей странице');
        return tabs[0];
    }
    
    // Ищем существующую вкладку со Столото
    const stolotoTabs = await chrome.tabs.query({ url: workPageUrl });
    
    if (stolotoTabs.length > 0) {
        // Переключаемся на существующую вкладку
        await chrome.tabs.update(stolotoTabs[0].id, { active: true });
        return stolotoTabs[0];
    }
    
    // Создаем новую вкладку
    return await chrome.tabs.create({ url: workPageUrl });
}
```

**Отправка сообщений с повторными попытками**:

```javascript
async function sendMessageWithRetry(tabId, message, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tabId, message, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            return response;
        } catch (error) {
            console.log(`Попытка ${attempt} неудачна:`, error.message);
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Ждем перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}
```

### 3. chrome.scripting

**Назначение**: Внедрение скриптов и CSS в веб-страницы.

**Права доступа**: `"scripting"` в manifest.json

#### Основные методы

##### chrome.scripting.executeScript()

Выполнение JavaScript кода на указанной вкладке.

```javascript
// Выполнение простого скрипта
await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
        console.log('Скрипт выполнен на странице');
        return document.title;
    }
});

// Выполнение скрипта с параметрами
await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (numbers) => {
        console.log('Поиск чисел:', numbers);
        // Логика поиска чисел на странице
        return numbers.length;
    },
    args: [[1, 5, 12, 23, 34]]
});

// Внедрение файла скрипта
await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
});
```

##### chrome.scripting.insertCSS()

Внедрение CSS стилей в страницу.

```javascript
// Внедрение CSS для стилизации статусного блока
await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    css: `
        #rusloto-status {
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
        }
    `
});
```

#### Практические примеры использования

**Динамическое внедрение функций**:

```javascript
// Внедрение функции проверки авторизации
async function injectAuthChecker(tabId) {
    const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            // Функция проверки авторизации
            function checkAuth() {
                const profileMenu = document.querySelector('[data-test-id="profile-menu"]');
                const walletElement = document.querySelector('a[href="/private/wallet?int=header"]');
                const loginBlock = Array.from(document.querySelectorAll('div, a, button, span'))
                    .find(el => el.textContent && el.textContent.trim().toLowerCase() === 'вход и регистрация');
                
                if (loginBlock) return false;
                return !!(profileMenu || walletElement);
            }
            
            return checkAuth();
        }
    });
    
    return result[0].result;
}
```

### 4. chrome.action

**Назначение**: Управление иконкой расширения в панели инструментов.

**Права доступа**: Не требует специальных разрешений

#### Основные методы

##### chrome.action.onClicked

Обработчик кликов по иконке расширения в background.js.

```javascript
chrome.action.onClicked.addListener(async (tab) => {
    // URL рабочей страницы приложения
    const workPageUrl = 'https://www.stoloto.ru/ruslotto/game?viewType=favorite';
    
    // Если текущая вкладка - рабочая страница приложения
    if (tab.url === workPageUrl) {
        // Открываем popup
        await chrome.action.setPopup({ popup: 'popup.html' });
        // Имитируем повторный клик, чтобы открыть popup
        await chrome.action.openPopup();
    } else {
        // Если текущая вкладка не рабочая, открываем новую
        await chrome.tabs.create({ url: workPageUrl });
    }
    
    // Сбрасываем popup, чтобы следующий клик снова прошёл через этот обработчик
    await chrome.action.setPopup({ popup: '' });
});
```

##### chrome.action.setPopup()

Установка popup для иконки расширения.

```javascript
// Установка popup
await chrome.action.setPopup({ popup: 'popup.html' });

// Отключение popup (для обработки кликов через onClicked)
await chrome.action.setPopup({ popup: '' });

// Установка popup для конкретной вкладки
await chrome.action.setPopup({ 
    tabId: tab.id,
    popup: 'popup.html' 
});
```

##### chrome.action.openPopup()

Программное открытие popup.

```javascript
// Открытие popup
try {
    await chrome.action.openPopup();
    console.log('Popup открыт');
} catch (error) {
    console.error('Ошибка открытия popup:', error);
}
```

##### chrome.action.setBadgeText()

Установка текста на значке расширения.

```javascript
// Показ количества найденных билетов
await chrome.action.setBadgeText({ text: '3' });

// Показ статуса поиска
await chrome.action.setBadgeText({ text: '...' });

// Очистка значка
await chrome.action.setBadgeText({ text: '' });

// Установка для конкретной вкладки
await chrome.action.setBadgeText({ 
    tabId: tab.id,
    text: 'OK' 
});
```

##### chrome.action.setBadgeBackgroundColor()

Установка цвета фона значка.

```javascript
// Зеленый цвет для успеха
await chrome.action.setBadgeBackgroundColor({ color: '#28a745' });

// Красный цвет для ошибки
await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });

// Синий цвет для процесса
await chrome.action.setBadgeBackgroundColor({ color: '#007bff' });
```

#### Практические примеры использования

**Динамическое управление popup**:

```javascript
// В event_page.js - умное управление popup
chrome.action.onClicked.addListener(async (tab) => {
    const workPageUrl = 'https://www.stoloto.ru/ruslotto/game?viewType=favorite';
    
    if (tab.url === workPageUrl) {
        // На рабочей странице - показываем popup
        await chrome.action.setPopup({ popup: 'popup.html' });
        
        // Имитируем повторный клик для открытия popup
        setTimeout(async () => {
            try {
                await chrome.action.openPopup();
            } catch (error) {
                console.log('Popup уже открыт или недоступен');
            }
        }, 100);
    } else {
        // Не на рабочей странице - перенаправляем
        await chrome.tabs.create({ url: workPageUrl });
    }
    
    // Сбрасываем popup для следующего клика
    setTimeout(async () => {
        await chrome.action.setPopup({ popup: '' });
    }, 1000);
});
```

**Индикация статуса через значок**:

```javascript
// Функция обновления статуса на значке
async function updateBadgeStatus(status, count = 0) {
    switch (status) {
        case 'searching':
            await chrome.action.setBadgeText({ text: '...' });
            await chrome.action.setBadgeBackgroundColor({ color: '#007bff' });
            break;
            
        case 'found':
            await chrome.action.setBadgeText({ text: count.toString() });
            await chrome.action.setBadgeBackgroundColor({ color: '#28a745' });
            break;
            
        case 'error':
            await chrome.action.setBadgeText({ text: '!' });
            await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
            break;
            
        case 'idle':
        default:
            await chrome.action.setBadgeText({ text: '' });
            break;
    }
}

// Использование в content.js
chrome.runtime.sendMessage({
    action: 'updateBadge',
    status: 'found',
    count: 3
});
```

## Руководство по устранению неполадок

### 1. Проблемы с chrome.storage

**Проблема**: Данные не сохраняются или не загружаются

**Возможные причины**:
- Превышен лимит хранилища (5MB для local storage)
- Ошибки сериализации объектов
- Отсутствие разрешения "storage"

**Решения**:

```javascript
// Проверка размера хранилища
chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
    console.log('Использовано байт:', bytesInUse);
    if (bytesInUse > 4 * 1024 * 1024) { // 4MB
        console.warn('Хранилище почти заполнено');
    }
});

// Безопасное сохранение с проверкой ошибок
async function safeSave(key, data) {
    try {
        await chrome.storage.local.set({ [key]: data });
        console.log(`Данные ${key} сохранены успешно`);
    } catch (error) {
        if (error.message.includes('QUOTA_EXCEEDED')) {
            console.error('Превышен лимит хранилища');
            // Очистка старых данных
            await cleanupOldData();
        } else {
            console.error('Ошибка сохранения:', error);
        }
    }
}

// Очистка устаревших данных
async function cleanupOldData() {
    const allData = await chrome.storage.local.get();
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    for (const [key, value] of Object.entries(allData)) {
        if (value.timestamp && value.timestamp < oneWeekAgo) {
            await chrome.storage.local.remove(key);
            console.log(`Удалены устаревшие данные: ${key}`);
        }
    }
}
```

### 2. Проблемы с chrome.tabs.sendMessage

**Проблема**: Сообщения не доходят до content script

**Возможные причины**:
- Content script не загружен на странице
- Неправильный ID вкладки
- Страница еще не полностью загружена
- Content script завершился с ошибкой

**Решения**:

```javascript
// Проверка готовности content script
async function ensureContentScriptReady(tabId) {
    const maxAttempts = 5;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response && response.status === 'pong') {
                return true;
            }
        } catch (error) {
            console.log(`Попытка ${attempt}: Content script не готов`);
        }
        
        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return false;
}

// В content.js - обработчик ping
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
        sendResponse({ status: 'pong' });
        return;
    }
    
    // Остальная логика обработки сообщений
});
```

### 3. Проблемы с chrome.scripting

**Проблема**: Скрипты не выполняются или выполняются с ошибками

**Возможные причины**:
- Отсутствие разрешения "scripting"
- Неправильный синтаксис внедряемого кода
- Конфликты с Content Security Policy страницы
- Попытка доступа к недоступным элементам DOM

**Решения**:

```javascript
// Безопасное выполнение скрипта с обработкой ошибок
async function safeExecuteScript(tabId, func, args = []) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: func,
            args: args
        });
        
        return results[0].result;
    } catch (error) {
        console.error('Ошибка выполнения скрипта:', error);
        
        if (error.message.includes('Cannot access')) {
            console.error('Нет доступа к вкладке. Проверьте URL и разрешения.');
        } else if (error.message.includes('No tab with id')) {
            console.error('Вкладка не найдена. Возможно, она была закрыта.');
        }
        
        return null;
    }
}

// Проверка доступности вкладки перед выполнением скрипта
async function checkTabAccessibility(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        
        // Проверяем, что это не системная страница
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('moz-extension://')) {
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Вкладка недоступна:', error);
        return false;
    }
}
```

### 4. Проблемы с chrome.action

**Проблема**: Popup не открывается или работает некорректно

**Возможные причины**:
- Конфликт между onClicked и popup
- Ошибки в HTML/JS файлах popup
- Неправильная последовательность вызовов API

**Решения**:

```javascript
// Правильное управление popup
let popupState = 'disabled'; // 'disabled', 'enabled', 'opening'

chrome.action.onClicked.addListener(async (tab) => {
    if (popupState === 'opening') {
        console.log('Popup уже открывается, игнорируем клик');
        return;
    }
    
    popupState = 'opening';
    
    try {
        const workPageUrl = 'https://www.stoloto.ru/ruslotto/game?viewType=favorite';
        
        if (tab.url === workPageUrl) {
            // Включаем popup
            await chrome.action.setPopup({ popup: 'popup.html' });
            popupState = 'enabled';
            
            // Открываем popup
            setTimeout(async () => {
                try {
                    await chrome.action.openPopup();
                } catch (error) {
                    console.log('Не удалось открыть popup:', error.message);
                }
                
                // Сбрасываем состояние через некоторое время
                setTimeout(() => {
                    chrome.action.setPopup({ popup: '' });
                    popupState = 'disabled';
                }, 2000);
            }, 100);
        } else {
            // Перенаправляем на рабочую страницу
            await chrome.tabs.create({ url: workPageUrl });
            popupState = 'disabled';
        }
    } catch (error) {
        console.error('Ошибка обработки клика:', error);
        popupState = 'disabled';
    }
});
```

## Лучшие практики

### 1. Обработка ошибок

- Всегда проверяйте `chrome.runtime.lastError` при работе с callback API
- Используйте try/catch блоки для async/await операций
- Предоставляйте fallback механизмы для критических операций

### 2. Производительность

- Минимизируйте количество обращений к Chrome Storage
- Кэшируйте часто используемые данные
- Используйте batch операции для множественных изменений

### 3. Безопасность

- Валидируйте все данные, получаемые через messaging API
- Не храните чувствительную информацию в storage
- Используйте минимально необходимые разрешения

### 4. Совместимость

- Проверяйте доступность API перед использованием
- Предоставляйте альтернативные пути выполнения
- Тестируйте на разных версиях Chrome