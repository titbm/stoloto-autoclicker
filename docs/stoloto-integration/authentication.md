# Система авторизации сайта Столото

## Обзор

Данный документ описывает систему авторизации на сайте Столото, методы определения статуса пользователя, получения баланса и работы с авторизованными функциями. Документация основана на анализе кода расширения и тестировании неавторизованного состояния.

## Состояния пользователя

### Неавторизованное состояние

#### Индикаторы неавторизованного пользователя

1. **Ссылка "Вход и регистрация"**
   ```html
   <link href="/auth?targetUrl=%2Fruslotto%2Fgame%3FviewType%3Dfavorite">
     Вход и регистрация
   </link>
   ```
   
   **Селектор**: `a[href*="/auth"]`
   **Проверка текста**: содержит "Вход и регистрация"

2. **Отсутствие элементов авторизованного пользователя**
   - Нет ссылки на кошелек
   - Нет ссылки на бонусы
   - Нет ссылки "Мои билеты"

#### Ограничения для неавторизованных пользователей

- Только просмотр билетов без возможности покупки
- Нет доступа к балансу и бонусам
- Нет истории покупок
- Режим автоматической покупки недоступен

### Авторизованное состояние

#### Индикаторы авторизованного пользователя

1. **Ссылка на баланс (кошелек)**
   ```html
   <a href="/private/wallet?int=header">1 500 ₽</a>
   ```
   
   **Селектор**: `a[href="/private/wallet?int=header"]`
   **Формат текста**: "X ₽" (например, "0 ₽", "1 500 ₽")

2. **Ссылка на бонусы**
   ```html
   <a href="/private/bonus?int=header">46</a>
   ```
   
   **Селектор**: `a[href="/private/bonus?int=header"]`
   **Формат текста**: число (количество бонусов)

3. **Ссылка "Мои билеты"**
   ```html
   <a href="/private/tickets/all?int=header">Мои билеты</a>
   ```
   
   **Селектор**: `a[href="/private/tickets/all?int=header"]`

## Функции определения авторизации

### Основная функция проверки: `isUserLoggedIn()`

```javascript
function isUserLoggedIn() {
    // 1. Проверяем наличие ссылки "Вход и регистрация"
    const loginLink = document.querySelector('a[href*="/auth"]');
    if (loginLink && loginLink.textContent.includes('Вход и регистрация')) {
        console.log('Обнаружена ссылка "Вход и регистрация" - пользователь НЕ авторизован');
        return false;
    }
    
    // 2. Проверяем наличие ссылки на кошелек
    const walletLink = document.querySelector('a[href="/private/wallet?int=header"]');
    if (walletLink) {
        console.log('Обнаружена ссылка на кошелек - пользователь авторизован');
        return true;
    }
    
    // 3. Проверяем наличие ссылки "Мои билеты"
    const myTicketsLink = document.querySelector('a[href="/private/tickets/all?int=header"]');
    if (myTicketsLink) {
        console.log('Обнаружена ссылка "Мои билеты" - пользователь авторизован');
        return true;
    }
    
    // По умолчанию считаем неавторизованным
    return false;
}
```

#### Логика работы

1. **Приоритет проверки неавторизованного состояния**
   - Сначала ищем ссылку "Вход и регистрация"
   - Если найдена - пользователь точно не авторизован

2. **Проверка индикаторов авторизации**
   - Ссылка на кошелек - основной индикатор
   - Ссылка "Мои билеты" - дополнительный индикатор

3. **Fallback поведение**
   - При отсутствии всех индикаторов считаем неавторизованным

## Работа с балансом пользователя

### Функция получения баланса: `getUserBalance()`

```javascript
function getUserBalance() {
    // Проверяем авторизацию
    if (!isUserLoggedIn()) {
        console.log('Невозможно получить баланс: пользователь не авторизован');
        return 0;
    }
    
    // Ищем ссылку на кошелек
    const walletLink = document.querySelector('a[href="/private/wallet?int=header"]');
    if (walletLink) {
        const balanceText = walletLink.textContent.trim();
        console.log('Найден текст баланса:', balanceText);
        
        // Извлекаем число из текста "1 500 ₽"
        const matches = balanceText.match(/(\d+(?:\s\d+)*)\s*₽/);
        if (matches) {
            const balanceValue = parseInt(matches[1].replace(/\s/g, ''));
            console.log('Баланс пользователя:', balanceValue);
            return balanceValue;
        }
    }
    
    return 0;
}
```

#### Особенности извлечения баланса

1. **Формат отображения баланса**
   ```
   Примеры:
   - "0 ₽"
   - "150 ₽"
   - "1 500 ₽"
   - "10 000 ₽"
   ```

2. **Регулярное выражение для извлечения**
   ```javascript
   const regex = /(\d+(?:\s\d+)*)\s*₽/;
   // Объяснение:
   // (\d+(?:\s\d+)*) - одна или более цифр, за которыми могут следовать пробелы и еще цифры
   // \s*₽ - опциональные пробелы и символ рубля
   ```

3. **Обработка пробелов в числах**
   ```javascript
   const cleanNumber = matches[1].replace(/\s/g, '');
   const balance = parseInt(cleanNumber);
   ```

### Функция проверки достаточности средств: `hasEnoughFunds()`

```javascript
function hasEnoughFunds(ticketsToBuy) {
    const ticketPrice = 150; // Стоимость одного билета в рублях
    const requiredAmount = ticketPrice * ticketsToBuy;
    const userBalance = getUserBalance();
    
    console.log(`Проверка средств: ${userBalance} руб. на счету, требуется ${requiredAmount} руб. для ${ticketsToBuy} билетов`);
    
    return userBalance >= requiredAmount;
}
```

#### Параметры стоимости

- **Стоимость билета**: 150 ₽
- **Минимальный баланс**: зависит от количества билетов
- **Проверка**: баланс >= (количество билетов × 150)

## Кэширование статуса авторизации

### Сохранение статуса в Chrome Storage

```javascript
// В модуле state.js
async function saveAuthStatus() {
    const authStatus = {
        isLoggedIn: window.stolotoAuth.isUserLoggedIn(),
        balance: window.stolotoAuth.getUserBalance(),
        timestamp: Date.now()
    };
    
    await chrome.storage.local.set({ authStatus });
    console.log('Статус авторизации сохранен:', authStatus);
}

// Загрузка статуса
async function loadAuthStatus() {
    const result = await chrome.storage.local.get(['authStatus']);
    return result.authStatus || { isLoggedIn: false, balance: 0 };
}
```

### Валидация кэшированных данных

```javascript
function isAuthStatusValid(authStatus) {
    const maxAge = 5 * 60 * 1000; // 5 минут
    const age = Date.now() - (authStatus.timestamp || 0);
    return age < maxAge;
}

async function getValidAuthStatus() {
    const cached = await loadAuthStatus();
    
    if (isAuthStatusValid(cached)) {
        return cached;
    }
    
    // Кэш устарел, получаем актуальные данные
    const current = {
        isLoggedIn: window.stolotoAuth.isUserLoggedIn(),
        balance: window.stolotoAuth.getUserBalance(),
        timestamp: Date.now()
    };
    
    await chrome.storage.local.set({ authStatus: current });
    return current;
}
```

## Интеграция с режимом покупки

### Проверка авторизации перед покупкой

```javascript
// В модуле main.js
function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'clickNumbers') {
            const needsAuth = request.isPurchaseMode;
            
            if (needsAuth && !window.stolotoAuth.isUserLoggedIn()) {
                console.log('❌ Пользователь не авторизован для режима покупки');
                window.stolotoUI.showAuthWarning();
                
                sendResponse({
                    status: 'error', 
                    message: 'Для использования режима автоматической покупки необходимо авторизоваться на сайте Столото'
                });
                return true;
            }
            
            // Продолжаем выполнение...
        }
    });
}
```

### Проверка баланса перед покупкой

```javascript
// В popup.js или аналогичном файле
async function validatePurchaseRequest(ticketsToBuy) {
    // Проверяем авторизацию
    const authStatus = await checkUserLogin();
    if (!authStatus.isLoggedIn) {
        throw new Error('Пользователь не авторизован');
    }
    
    // Проверяем баланс
    const balanceCheck = await checkUserBalance(ticketsToBuy);
    if (!balanceCheck.hasEnoughFunds) {
        throw new Error(`Недостаточно средств. Требуется: ${balanceCheck.requiredAmount} ₽, доступно: ${balanceCheck.balance} ₽`);
    }
    
    return true;
}
```

## Обработка изменений авторизации

### Мониторинг изменений статуса

```javascript
let lastAuthStatus = null;

function monitorAuthStatus() {
    const currentStatus = window.stolotoAuth.isUserLoggedIn();
    
    if (lastAuthStatus !== null && lastAuthStatus !== currentStatus) {
        console.log('Изменение статуса авторизации:', lastAuthStatus, '->', currentStatus);
        
        // Обновляем кэш
        saveAuthStatus();
        
        // Уведомляем popup
        chrome.runtime.sendMessage({
            action: 'authStatusChanged',
            isLoggedIn: currentStatus
        });
    }
    
    lastAuthStatus = currentStatus;
}

// Запускаем мониторинг каждые 30 секунд
setInterval(monitorAuthStatus, 30000);
```

### Восстановление после потери авторизации

```javascript
function handleAuthLoss() {
    console.log('⚠️ Обнаружена потеря авторизации');
    
    // Останавливаем режим покупки
    if (window.stolotoState.isPurchaseMode) {
        window.stolotoState.isPurchaseMode = false;
        window.stolotoState.resetPurchaseState();
        
        // Уведомляем пользователя
        window.stolotoUI.showAuthWarning();
    }
    
    // Обновляем статус
    saveAuthStatus();
}
```

## Отладка и диагностика

### Функции для отладки авторизации

```javascript
// Диагностическая функция
function debugAuthStatus() {
    console.group('🔍 Диагностика авторизации');
    
    // Проверяем все индикаторы
    const loginLink = document.querySelector('a[href*="/auth"]');
    const walletLink = document.querySelector('a[href="/private/wallet?int=header"]');
    const bonusLink = document.querySelector('a[href="/private/bonus?int=header"]');
    const ticketsLink = document.querySelector('a[href="/private/tickets/all?int=header"]');
    
    console.log('Ссылка "Вход и регистрация":', loginLink ? loginLink.textContent : 'не найдена');
    console.log('Ссылка на кошелек:', walletLink ? walletLink.textContent : 'не найдена');
    console.log('Ссылка на бонусы:', bonusLink ? bonusLink.textContent : 'не найдена');
    console.log('Ссылка "Мои билеты":', ticketsLink ? 'найдена' : 'не найдена');
    
    const isLoggedIn = window.stolotoAuth.isUserLoggedIn();
    const balance = window.stolotoAuth.getUserBalance();
    
    console.log('Статус авторизации:', isLoggedIn ? '✅ Авторизован' : '❌ Не авторизован');
    console.log('Баланс:', balance, '₽');
    
    console.groupEnd();
    
    return { isLoggedIn, balance, elements: { loginLink, walletLink, bonusLink, ticketsLink } };
}

// Автоматическая диагностика при загрузке
window.addEventListener('load', () => {
    setTimeout(debugAuthStatus, 1000);
});
```

### Тестирование функций авторизации

```javascript
// Тестовая функция для проверки всех сценариев
function testAuthFunctions() {
    console.group('🧪 Тестирование функций авторизации');
    
    try {
        // Тест 1: Проверка авторизации
        const isLoggedIn = window.stolotoAuth.isUserLoggedIn();
        console.log('Тест isUserLoggedIn():', isLoggedIn ? 'PASS' : 'PASS (не авторизован)');
        
        // Тест 2: Получение баланса
        const balance = window.stolotoAuth.getUserBalance();
        console.log('Тест getUserBalance():', typeof balance === 'number' ? 'PASS' : 'FAIL');
        
        // Тест 3: Проверка средств
        const hasEnough1 = window.stolotoAuth.hasEnoughFunds(1);
        const hasEnough10 = window.stolotoAuth.hasEnoughFunds(10);
        console.log('Тест hasEnoughFunds(1):', typeof hasEnough1 === 'boolean' ? 'PASS' : 'FAIL');
        console.log('Тест hasEnoughFunds(10):', typeof hasEnough10 === 'boolean' ? 'PASS' : 'FAIL');
        
        console.log('✅ Все тесты пройдены');
    } catch (error) {
        console.error('❌ Ошибка в тестах:', error);
    }
    
    console.groupEnd();
}
```

## Безопасность и ограничения

### Ограничения клиентской проверки

1. **Доверие к DOM**
   - Авторизация определяется по элементам DOM
   - Возможны ложные срабатывания при изменении структуры сайта

2. **Отсутствие серверной валидации**
   - Нет прямого API для проверки авторизации
   - Полагаемся на косвенные признаки

3. **Кэширование данных**
   - Статус может устареть между проверками
   - Необходимо регулярное обновление

### Рекомендации по безопасности

1. **Регулярная проверка статуса**
   ```javascript
   // Проверяем авторизацию перед каждой критической операцией
   if (!window.stolotoAuth.isUserLoggedIn()) {
       throw new Error('Требуется авторизация');
   }
   ```

2. **Валидация баланса**
   ```javascript
   // Проверяем баланс перед покупкой
   const balance = window.stolotoAuth.getUserBalance();
   if (balance < requiredAmount) {
       throw new Error('Недостаточно средств');
   }
   ```

3. **Обработка ошибок**
   ```javascript
   try {
       const result = await performPurchase();
   } catch (error) {
       if (error.message.includes('авторизация')) {
           // Перенаправляем на страницу входа
           window.location.href = '/auth';
       }
   }
   ```

## Совместимость и обновления

### Поддерживаемые версии сайта
- Текущая версия сайта Столото (2025)
- Совместимость с Manifest V3

### Планы развития
1. **Улучшенная детекция авторизации**
   - Дополнительные индикаторы
   - Более надежные селекторы

2. **Расширенная работа с балансом**
   - История транзакций
   - Уведомления о низком балансе

3. **Интеграция с API**
   - Прямые запросы к серверу (если появится API)
   - Более точная информация о статусе