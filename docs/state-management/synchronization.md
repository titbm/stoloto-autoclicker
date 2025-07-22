# Синхронизация компонентов

## Обзор

Расширение "Столото Автокликер" использует систему обмена сообщениями Chrome для синхронизации состояния между компонентами. Основная коммуникация происходит между popup.js (интерфейс пользователя) и content.js (логика работы на странице).

## Архитектура синхронизации

### Компоненты системы

- **popup.js** - управляет пользовательским интерфейсом и инициирует операции
- **content.js** - выполняет операции на странице и отправляет обратную связь
- **Chrome Storage** - обеспечивает персистентность данных между сессиями

### Потоки данных

```
popup.js ←→ chrome.tabs.sendMessage ←→ content.js
    ↓                                      ↓
chrome.storage.local ←→ Shared State ←→ chrome.storage.local
```

## Обмен сообщениями

### Типы сообщений

#### 1. Запуск поиска билетов

**Отправитель:** popup.js  
**Получатель:** content.js

```javascript
// popup.js
chrome.tabs.sendMessage(activeTab.id, {
    action: 'clickNumbers',
    numbers: numbers,
    excludeNumbers: excludeNumbers,
    mode: searchMode.value,
    isPurchaseMode: isPurchaseMode,
    ticketsToBuy: ticketsToBuy
});
```

**Обработка в content.js:**
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'clickNumbers') {
        // Проверка авторизации для режима покупки
        if (request.isPurchaseMode && !isUserLoggedIn()) {
            sendResponse({
                status: 'error', 
                message: 'Для использования режима автоматической покупки необходимо авторизоваться на сайте Столото'
            });
            return true;
        }
        
        // Установка параметров и запуск поиска
        isPurchaseMode = request.isPurchaseMode || false;
        totalTicketsToBuy = request.ticketsToBuy || 0;
        purchaseSearchNumbers = request.numbers;
        // ...
    }
});
```

#### 2. Остановка поиска

**Отправитель:** popup.js  
**Получатель:** content.js

```javascript
// popup.js
chrome.tabs.sendMessage(tab.id, { action: 'stopSearch' }, () => {
    isSearching = false;
    button.textContent = 'Запустить';
    button.classList.remove('stop');
    button.classList.add('start');
    button.disabled = false;
});
```

#### 3. Проверка авторизации

**Отправитель:** popup.js  
**Получатель:** content.js

```javascript
// popup.js
chrome.tabs.sendMessage(tabs[0].id, { action: 'checkUserLogin' }, (response) => {
    if (response && response.isLoggedIn !== undefined) {
        isUserAuthenticated = response.isLoggedIn;
        // Сохранение в Chrome Storage
        chrome.storage.local.set({
            authStatus: {
                isLoggedIn: isUserAuthenticated,
                timestamp: Date.now()
            }
        });
    }
});
```

**Обработка в content.js:**
```javascript
if (request.action === 'checkUserLogin') {
    const loginStatus = isUserLoggedIn();
    sendResponse({ isLoggedIn: loginStatus });
    return true;
}
```

#### 4. Проверка баланса пользователя

**Отправитель:** popup.js  
**Получатель:** content.js

```javascript
// popup.js
chrome.tabs.sendMessage(tab.id, { 
    action: 'checkUserBalance', 
    ticketsToBuy: ticketsToBuy 
}, (response) => {
    if (response && response.balance !== undefined) {
        resolve({ 
            hasEnoughFunds: response.hasEnoughFunds, 
            balance: response.balance 
        });
    }
});
```

**Обработка в content.js:**
```javascript
if (request.action === 'checkUserBalance') {
    const balance = getUserBalance();
    const requiredAmount = request.ticketsToBuy * TICKET_PRICE;
    sendResponse({
        balance: balance,
        hasEnoughFunds: balance >= requiredAmount
    });
    return true;
}
```

## Синхронизация состояния

### Состояние поиска

#### В popup.js
```javascript
let isSearching = false;
let isUserAuthenticated = false;

// Обновление UI при изменении состояния
function updateAuthDependentUI() {
    if (!isUserAuthenticated) {
        testPurchaseModeCheckbox.disabled = true;
        authWarningElement.style.display = 'block';
    } else {
        testPurchaseModeCheckbox.disabled = false;
        authWarningElement.style.display = 'none';
    }
}
```

#### В content.js
```javascript
let isSearching = false;
let searchMode = 'half';
let ticketsChecked = 0;
let searchStartTime = null;

// Обновление статуса в реальном времени
function updateStatusBlock(numbers, excludeNumbers, mode) {
    let statusEl = document.getElementById('rusloto-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'rusloto-status';
        statusEl.style.cssText = STATUS_STYLES;
        document.body.insertBefore(statusEl, document.body.firstChild);
    }
    
    const statusText = `Ищем числа ${numbers.join(', ')} ${modeText}`;
    statusEl.textContent = statusText;
}
```

### Состояние покупки

#### Сохранение промежуточных результатов

```javascript
// content.js
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
}
```

#### Восстановление состояния

```javascript
// content.js
async function loadPurchaseState() {
    try {
        const data = await chrome.storage.local.get('purchaseState');
        if (data.purchaseState) {
            isPurchaseMode = data.purchaseState.isPurchaseMode;
            totalTicketsToBuy = data.purchaseState.totalTicketsToBuy;
            ticketsPurchased = data.purchaseState.ticketsPurchased;
            // ... восстановление остальных полей
            
            // Продолжение процесса покупки
            if (isPurchaseMode && ticketsPurchased < totalTicketsToBuy) {
                setTimeout(() => {
                    clearSelection().then(() => {
                        clickNumbers(purchaseSearchNumbers, purchaseSearchMode, purchaseExcludeNumbers);
                    });
                }, 1500);
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке состояния покупки:', error);
    }
}
```

## Обновление UI в реальном времени

### Индикатор прогресса поиска

```javascript
// content.js
function updateStatusBlock(numbers, excludeNumbers, mode) {
    const ticketsText = ticketsChecked > 0 ? `Проверено билетов: ${ticketsChecked}` : '';
    const timeText = searchStartTime ? `Время поиска: ${formatSearchTime()}` : '';
    
    let statusText = `Ищем числа ${numbersText}${excludeText} ${modeText}`;
    
    if (ticketsText || timeText) {
        statusText += `\n${ticketsText}${ticketsText && timeText ? '. ' : ''}${timeText}`;
    }
    
    if (isPurchaseMode) {
        const purchaseText = `Автоматическая покупка. Куплено билетов: ${ticketsPurchased} из ${totalTicketsToBuy}`;
        statusText += `\n${purchaseText}`;
    }
    
    statusEl.textContent = statusText;
}
```

### Обновление состояния кнопок

```javascript
// popup.js
button.addEventListener('click', async () => {
    if (!isSearching) {
        // Запуск поиска
        isSearching = true;
        button.textContent = 'Остановить';
        button.classList.remove('start');
        button.classList.add('stop');
    } else {
        // Остановка поиска
        isSearching = false;
        button.textContent = 'Запустить';
        button.classList.remove('stop');
        button.classList.add('start');
    }
});
```

## Разрешение конфликтов

### Конфликты авторизации

```javascript
// popup.js
async function checkActiveTabAuth() {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'checkUserLogin' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Не удалось проверить авторизацию:', chrome.runtime.lastError.message);
                resolve(false);
                return;
            }
            
            if (response && response.isLoggedIn !== undefined) {
                isUserAuthenticated = response.isLoggedIn;
                // Сохранение актуального статуса
                chrome.storage.local.set({
                    authStatus: {
                        isLoggedIn: isUserAuthenticated,
                        timestamp: Date.now()
                    }
                });
                resolve(isUserAuthenticated);
            } else {
                resolve(false);
            }
        });
        
        // Таймаут для предотвращения зависания
        setTimeout(() => {
            console.log('Таймаут при проверке авторизации');
            resolve(false);
        }, 1000);
    });
}
```

### Конфликты дублирующихся чисел

```javascript
// popup.js
function removeDuplicateNumbers(numbers, excludeNumbers) {
    const duplicates = numbers.filter(num => excludeNumbers.includes(num));
    
    if (duplicates.length > 0) {
        const filteredExcludeNumbers = excludeNumbers.filter(num => !numbers.includes(num));
        excludeNumbersInput.value = filteredExcludeNumbers.join(', ');
        highlightExcludeInput(); // Визуальная индикация изменения
        
        return {
            hasDuplicates: true,
            duplicates: duplicates,
            filteredExcludeNumbers: filteredExcludeNumbers
        };
    }
    
    return {
        hasDuplicates: false,
        duplicates: [],
        filteredExcludeNumbers: excludeNumbers
    };
}
```

## Процедуры восстановления синхронизации

### Восстановление после перезагрузки страницы

```javascript
// content.js - выполняется при загрузке страницы
loadPurchaseState(); // Восстановление состояния покупки
saveAuthStatus();    // Обновление статуса авторизации

// popup.js - выполняется при открытии popup
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthFromStorage();    // Проверка кэшированной авторизации
    updateAuthDependentUI();         // Обновление интерфейса
    await loadLastSearchParams();    // Восстановление параметров поиска
    
    // Дополнительные проверки для повышения точности
    setTimeout(async () => {
        await checkActiveTabAuth();
        updateAuthDependentUI();
    }, 500);
});
```

### Обработка потери соединения

```javascript
// popup.js
chrome.tabs.sendMessage(activeTab.id, message, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Ошибка:', chrome.runtime.lastError);
        alert('Ошибка: убедитесь, что вы находитесь на странице Столото');
        button.disabled = false;
        return;
    }
    
    if (response && response.status === 'error') {
        console.error('Ошибка:', response.message);
        alert(response.message);
        button.disabled = false;
        return;
    }
    
    // Успешная обработка
    console.log('Операция выполнена успешно');
});
```

### Восстановление после ошибок

```javascript
// content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        // Обработка сообщения
        if (request.action === 'clickNumbers') {
            // ... логика обработки
            sendResponse({ status: 'success' });
        }
    } catch (error) {
        console.error('Ошибка при обработке сообщения:', error);
        sendResponse({ 
            status: 'error', 
            message: error.message 
        });
    }
    return true; // Асинхронный ответ
});
```

## Оптимизация производительности

### Батчинг обновлений состояния

```javascript
// content.js
let updateTimer = null;

function scheduleStatusUpdate(numbers, excludeNumbers, mode) {
    if (updateTimer) {
        clearTimeout(updateTimer);
    }
    
    updateTimer = setTimeout(() => {
        updateStatusBlock(numbers, excludeNumbers, mode);
        updateTimer = null;
    }, 100); // Дебаунсинг обновлений
}
```

### Кэширование часто используемых данных

```javascript
// popup.js
let cachedAuthStatus = null;
let lastAuthCheck = 0;

async function checkAuthFromStorage() {
    const now = Date.now();
    
    // Используем кэш если данные свежие (менее 10 секунд)
    if (cachedAuthStatus && (now - lastAuthCheck) < 10000) {
        return cachedAuthStatus.isLoggedIn;
    }
    
    // Обновляем кэш
    const data = await chrome.storage.local.get('authStatus');
    if (data.authStatus) {
        cachedAuthStatus = data.authStatus;
        lastAuthCheck = now;
        return data.authStatus.isLoggedIn;
    }
    
    return false;
}
```

## Мониторинг и отладка

### Логирование синхронизации

```javascript
// Включить детальное логирование
const DEBUG_SYNC = true;

function logSync(component, action, data) {
    if (DEBUG_SYNC) {
        console.log(`[${component}] ${action}:`, data);
    }
}

// Использование
logSync('popup', 'sendMessage', { action: 'clickNumbers', numbers });
logSync('content', 'receiveMessage', request);
logSync('storage', 'save', { key: 'purchaseState', data });
```

### Диагностика проблем синхронизации

```javascript
// Проверка состояния синхронизации
async function diagnoseSyncState() {
    const storageData = await chrome.storage.local.get();
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    console.log('Диагностика синхронизации:', {
        storage: storageData,
        activeTab: tabs[0]?.url,
        popupState: { isSearching, isUserAuthenticated },
        timestamp: new Date().toISOString()
    });
}
```