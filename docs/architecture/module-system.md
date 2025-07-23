# Модульная система

## Обзор

Расширение "Столото Автокликер" построено на модульной архитектуре, где каждый модуль отвечает за конкретную область функциональности. Все модули располагаются в папке `modules/` и загружаются в строго определенном порядке через `manifest.json`.

## Структура папки modules/

```
modules/
├── utils.js      - Вспомогательные функции общего назначения
├── state.js      - Управление глобальным состоянием приложения  
├── ui.js         - Управление пользовательским интерфейсом
├── auth.js       - Авторизация и работа с балансом пользователя
├── payment.js    - Обработка платежей и покупок
├── search.js     - Поиск и анализ билетов
└── main.js       - Основная логика координации и обработка сообщений
```

## Назначение каждого модуля

### utils.js - Вспомогательные функции

**Назначение**: Содержит утилиты общего назначения, используемые другими модулями.

**Экспортируемые функции**:
- `formatSearchTime()` - форматирование времени поиска в читаемый вид

**Пример использования**:
```javascript
const timeSpent = window.stolotoUtils.formatSearchTime();
// Возвращает: "2м 35с"
```

**Зависимости**: Не зависит от других модулей

### state.js - Управление состоянием

**Назначение**: Управляет глобальным состоянием приложения, включая состояние поиска и покупки.

**Глобальное состояние**:
```javascript
window.stolotoState = {
    // Состояние поиска
    isSearching: false,
    searchMode: 'half',
    ticketsChecked: 0,
    searchStartTime: null,
    
    // Состояние покупки
    isPurchaseMode: false,
    totalTicketsToBuy: 0,
    ticketsPurchased: 0,
    purchaseSearchNumbers: [],
    purchaseExcludeNumbers: [],
    purchaseSearchMode: 'half',
    purchaseTicketsChecked: 0,
    purchaseStartTime: null
};
```

**Экспортируемые функции**:
- `savePurchaseState()` - сохранение состояния покупки в Chrome Storage
- `loadPurchaseState()` - загрузка состояния покупки из Chrome Storage
- `resetPurchaseState()` - сброс состояния покупки
- `saveAuthStatus()` - сохранение статуса авторизации

**Зависимости**: utils.js (для форматирования времени)

### ui.js - Пользовательский интерфейс

**Назначение**: Управляет отображением статуса поиска, предупреждений и другими элементами UI на странице.

**Экспортируемые функции**:
- `updateStatusBlock(numbers, excludeNumbers, mode)` - создание/обновление блока статуса
- `removeStatusBlock()` - удаление блока статуса
- `showAuthWarning()` - отображение предупреждения о необходимости авторизации
- `showInsufficientFundsWarning(ticketsToBuy)` - предупреждение о недостатке средств

**Пример использования**:
```javascript
// Обновление статуса поиска
window.stolotoUI.updateStatusBlock([1, 2, 3], [4, 5], 'half');

// Показ предупреждения об авторизации
window.stolotoUI.showAuthWarning();
```

**Зависимости**: state.js, utils.js, auth.js

### auth.js - Авторизация и баланс

**Назначение**: Проверка авторизации пользователя на сайте и получение информации о балансе.

**Экспортируемые функции**:
- `isUserLoggedIn()` - проверка авторизации пользователя
- `getUserBalance()` - получение баланса пользователя
- `hasEnoughFunds(ticketsToBuy)` - проверка достаточности средств

**Логика проверки авторизации**:
```javascript
function isUserLoggedIn() {
    // Проверяем отсутствие ссылки "Вход и регистрация"
    const loginLink = document.querySelector('a[href*="/auth"]');
    if (loginLink && loginLink.textContent.includes('Вход и регистрация')) {
        return false;
    }
    
    // Проверяем наличие ссылки на кошелек
    const walletLink = document.querySelector('a[href="/private/wallet?int=header"]');
    return !!walletLink;
}
```

**Зависимости**: Не зависит от других модулей

### payment.js - Обработка платежей

**Назначение**: Проверка наличия кнопок оплаты и обработка платежных операций.

**Экспортируемые функции**:
- `checkPaymentButtons()` - проверка наличия кнопок оплаты

**Пример использования**:
```javascript
const paymentStatus = window.stolotoPayment.checkPaymentButtons();
// Возвращает: { walletPaymentAvailable: true, qrPaymentAvailable: false }
```

**Зависимости**: Не зависит от других модулей

### search.js - Поиск и анализ билетов

**Назначение**: Выполняет поиск подходящих билетов, анализ билетов по критериям и навигацию между страницами.

**Экспортируемые функции**:
- `clearSelection()` - очистка выбранных чисел
- `analyzeTicket(ticket, numbers)` - анализ билета на соответствие критериям
- `findSuitableTicket(numbers)` - поиск подходящего билета

**Алгоритмы анализа**:
- **anywhere**: поиск чисел в любом месте билета
- **half**: поиск в верхней (1-3) или нижней (4-6) половине
- **row**: поиск всех чисел в одной строке

**Зависимости**: state.js, ui.js, auth.js, payment.js, utils.js

### main.js - Основная логика координации

**Назначение**: Координирует работу всех модулей, содержит основную функцию поиска и обработчик сообщений от popup.

**Экспортируемые функции**:
- `clickNumbers(numbers, mode, excludeNumbers)` - основная функция поиска
- `setupMessageListener()` - настройка обработчика сообщений

**Обработка сообщений**:
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'clickNumbers') {
        // Запуск поиска билетов
    } else if (request.action === 'stopSearch') {
        // Остановка поиска
    } else if (request.action === 'checkUserLogin') {
        // Проверка авторизации
    } else if (request.action === 'checkUserBalance') {
        // Проверка баланса
    }
});
```

**Зависимости**: Использует все предыдущие модули

## Система экспорта в глобальное пространство window

Каждый модуль экспортирует свои функции в глобальное пространство `window` с использованием префикса `stoloto`:

```javascript
// Пример из auth.js
window.stolotoAuth = {
    isUserLoggedIn,
    getUserBalance,
    hasEnoughFunds
};

// Пример из search.js  
window.stolotoSearch = {
    clearSelection,
    analyzeTicket,
    findSuitableTicket
};
```

### Преимущества такого подхода:

1. **Простота доступа**: функции доступны из любого места кода
2. **Избежание конфликтов**: использование префикса `stoloto` предотвращает конфликты имен
3. **Совместимость**: работает во всех браузерах без дополнительных инструментов
4. **Отладка**: легко проверить доступность модулей в консоли браузера

### Проверка загрузки модулей:

```javascript
// В content.js проверяется загрузка всех модулей
const requiredModules = ['stolotoState', 'stolotoAuth', 'stolotoUI', 
                       'stolotoUtils', 'stolotoPayment', 'stolotoSearch', 'stolotoMain'];
const missingModules = requiredModules.filter(module => !window[module]);

if (missingModules.length > 0) {
    console.error('Не загружены модули:', missingModules);
    return;
}
```

## Порядок загрузки модулей через manifest.json

Модули загружаются в строго определенном порядке для обеспечения правильного разрешения зависимостей:

```json
"content_scripts": [{
    "matches": ["https://www.stoloto.ru/ruslotto/game?viewType=favorite"],
    "js": [
        "modules/utils.js",      // 1. Вспомогательные функции
        "modules/state.js",      // 2. Управление состоянием  
        "modules/ui.js",         // 3. Пользовательский интерфейс
        "modules/auth.js",       // 4. Авторизация и баланс
        "modules/payment.js",    // 5. Обработка платежей
        "modules/search.js",     // 6. Поиск и анализ билетов
        "modules/main.js",       // 7. Основная логика координации
        "content.js"             // 8. Точка входа
    ]
}]
```

### Принципы порядка загрузки:

1. **Независимые модули первыми**: модули без зависимостей загружаются в начале
2. **Зависимости перед зависимыми**: модуль загружается только после всех его зависимостей
3. **Координатор последним**: main.js загружается после всех модулей, которые он использует
4. **Точка входа в конце**: content.js загружается последним для инициализации

## Зависимости между модулями и их разрешение

### Граф зависимостей:

```
utils.js (независимый)
    ↓
state.js → utils.js
    ↓
ui.js → state.js, utils.js, auth.js
    ↓
auth.js (независимый)
    ↓
payment.js (независимый)
    ↓
search.js → state.js, ui.js, auth.js, payment.js, utils.js
    ↓
main.js → все предыдущие модули
    ↓
content.js → проверяет загрузку всех модулей
```

### Разрешение зависимостей:

1. **Статическое разрешение**: все зависимости разрешаются во время загрузки
2. **Глобальное пространство**: модули обращаются к зависимостям через `window`
3. **Проверка доступности**: content.js проверяет загрузку всех модулей перед инициализацией
4. **Обработка ошибок**: при отсутствии модуля выводится ошибка и инициализация прекращается

### Пример использования зависимостей:

```javascript
// В search.js используются функции из других модулей
function findSuitableTicket(numbers) {
    const state = window.stolotoState;  // Зависимость от state.js
    
    // Обновляем UI
    window.stolotoUI.updateStatusBlock(numbers, [], mode);  // Зависимость от ui.js
    
    // Проверяем авторизацию
    if (state.isPurchaseMode && !window.stolotoAuth.isUserLoggedIn()) {  // Зависимость от auth.js
        return false;
    }
    
    // Проверяем кнопки оплаты
    const paymentStatus = window.stolotoPayment.checkPaymentButtons();  // Зависимость от payment.js
}
```

## Инициализация модульной системы

### Процесс инициализации:

1. **Загрузка модулей**: Chrome загружает все модули в порядке, указанном в manifest.json
2. **Экспорт функций**: каждый модуль экспортирует свои функции в `window`
3. **Проверка загрузки**: content.js проверяет доступность всех модулей
4. **Инициализация состояния**: инициализируется глобальное состояние
5. **Настройка обработчиков**: настраиваются обработчики сообщений и событий
6. **Загрузка данных**: загружается сохраненное состояние из Chrome Storage

### Обработка ошибок загрузки:

```javascript
// Проверка загрузки модулей в content.js
const requiredModules = ['stolotoState', 'stolotoAuth', 'stolotoUI', 
                       'stolotoUtils', 'stolotoPayment', 'stolotoSearch', 'stolotoMain'];
const missingModules = requiredModules.filter(module => !window[module]);

if (missingModules.length > 0) {
    console.error('Не загружены модули:', missingModules);
    return;  // Прекращаем инициализацию
}

console.log('Все модули успешно загружены');
```

## Преимущества модульной архитектуры

### Разделение ответственности
- Каждый модуль имеет четко определенную роль
- Упрощается понимание и сопровождение кода
- Легче локализовать и исправлять ошибки

### Переиспользование кода
- Функции могут использоваться разными модулями
- Избегается дублирование кода
- Упрощается рефакторинг

### Упрощение тестирования
- Каждый модуль может тестироваться независимо
- Легче создавать моки для зависимостей
- Упрощается отладка

### Масштабируемость
- Легко добавлять новые модули
- Простое изменение существующих модулей
- Гибкая архитектура для будущих расширений