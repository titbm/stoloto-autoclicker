# Схема Chrome Storage

## Обзор

Расширение "Столото Автокликер" использует Chrome Storage API для сохранения состояния приложения между сессиями. Все данные хранятся в `chrome.storage.local` для обеспечения быстрого доступа и синхронизации между компонентами расширения.

## Структуры данных

### purchaseState

Объект для хранения состояния режима автоматической покупки билетов.

```javascript
{
  purchaseState: {
    isPurchaseMode: boolean,           // Флаг активности режима покупки
    totalTicketsToBuy: number,         // Общее количество билетов для покупки
    ticketsPurchased: number,          // Количество уже купленных билетов
    purchaseSearchNumbers: number[],   // Массив чисел для поиска в режиме покупки
    purchaseExcludeNumbers: number[],  // Массив исключаемых чисел
    purchaseSearchMode: string,        // Режим поиска: 'anywhere', 'half', 'row'
    purchaseTicketsChecked: number,    // Количество просмотренных билетов
    purchaseStartTime: number,         // Время начала поиска (timestamp)
    timestamp: number                  // Время последнего обновления состояния
  }
}
```

**Поля объекта:**

- `isPurchaseMode` - определяет, активен ли режим автоматической покупки
- `totalTicketsToBuy` - целевое количество билетов для покупки (от 1 до 999)
- `ticketsPurchased` - счетчик успешно купленных билетов
- `purchaseSearchNumbers` - массив чисел от 1 до 90 для поиска в билетах
- `purchaseExcludeNumbers` - массив чисел, которые должны отсутствовать в билете
- `purchaseSearchMode` - стратегия поиска чисел в билете
- `purchaseTicketsChecked` - общее количество проанализированных билетов
- `purchaseStartTime` - Unix timestamp начала процесса покупки
- `timestamp` - Unix timestamp последнего сохранения состояния

### lastSearch

Объект для сохранения параметров последнего поиска пользователя.

```javascript
{
  lastSearch: {
    numbers: number[],          // Числа для поиска
    excludeNumbers: number[],   // Исключаемые числа
    mode: string,              // Режим поиска
    isPurchaseMode: boolean,   // Был ли активен режим покупки
    ticketsToBuy: number,      // Количество билетов для покупки
    timestamp: number          // Время последнего поиска
  }
}
```

**Поля объекта:**

- `numbers` - массив чисел от 1 до 90 для поиска
- `excludeNumbers` - массив чисел, которые не должны присутствовать в билете
- `mode` - режим поиска: 'anywhere' | 'half' | 'row'
- `isPurchaseMode` - флаг активности режима покупки в последнем поиске
- `ticketsToBuy` - количество билетов для покупки (используется при восстановлении настроек)
- `timestamp` - Unix timestamp последнего поиска

### authStatus

Объект для кэширования статуса авторизации пользователя.

```javascript
{
  authStatus: {
    isLoggedIn: boolean,    // Статус авторизации пользователя
    timestamp: number       // Время последней проверки
  }
}
```

**Поля объекта:**

- `isLoggedIn` - true если пользователь авторизован на сайте Столото
- `timestamp` - Unix timestamp последней проверки авторизации

## Операции с данными

### Сохранение состояния покупки

```javascript
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

### Загрузка состояния покупки

```javascript
async function loadPurchaseState() {
    const data = await chrome.storage.local.get('purchaseState');
    if (data.purchaseState) {
        isPurchaseMode = data.purchaseState.isPurchaseMode;
        totalTicketsToBuy = data.purchaseState.totalTicketsToBuy;
        ticketsPurchased = data.purchaseState.ticketsPurchased;
        // ... остальные поля
    }
}
```

### Сохранение параметров поиска

```javascript
async function saveSearchParams(numbers, excludeNumbers, mode, isPurchaseMode, ticketsToBuy) {
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
}
```

### Сохранение статуса авторизации

```javascript
function saveAuthStatus() {
    const isLoggedIn = isUserLoggedIn();
    chrome.storage.local.set({
        authStatus: {
            isLoggedIn: isLoggedIn,
            timestamp: Date.now()
        }
    });
}
```

## Валидация данных

### Временные метки

Все объекты содержат поле `timestamp` для отслеживания актуальности данных:

- **authStatus**: данные считаются актуальными в течение 10 секунд
- **lastSearch**: данные восстанавливаются независимо от времени
- **purchaseState**: данные восстанавливаются при перезагрузке страницы

### Валидация чисел

```javascript
function parseNumbers(input) {
    return input.split(',')
        .map(num => num.trim())
        .filter(num => {
            const n = parseInt(num);
            return !isNaN(n) && n >= 1 && n <= 90;
        });
}
```

### Проверка дубликатов

Система автоматически удаляет дублирующиеся числа между полями поиска и исключений:

```javascript
function removeDuplicateNumbers(numbers, excludeNumbers) {
    const duplicates = numbers.filter(num => excludeNumbers.includes(num));
    if (duplicates.length > 0) {
        const filteredExcludeNumbers = excludeNumbers.filter(num => !numbers.includes(num));
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

## Очистка данных

### Сброс состояния покупки

```javascript
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
}
```

### Условия очистки

- **purchaseState** очищается при завершении покупки или выходе пользователя из аккаунта
- **authStatus** обновляется при каждой проверке авторизации
- **lastSearch** сохраняется до следующего поиска

## Обработка ошибок

### Проверка существования данных

```javascript
async function loadLastSearchParams() {
    const data = await chrome.storage.local.get('lastSearch');
    if (data.lastSearch) {
        // Восстанавливаем параметры только если данные существуют
        numbersInput.value = data.lastSearch.numbers.join(', ');
        // ...
    }
}
```

### Обработка устаревших данных

```javascript
async function checkAuthFromStorage() {
    const data = await chrome.storage.local.get('authStatus');
    if (data.authStatus) {
        const isRecent = (Date.now() - data.authStatus.timestamp) < 10 * 1000;
        if (isRecent) {
            return data.authStatus.isLoggedIn;
        }
    }
    // Если данные устарели, запрашиваем новые
    return await checkActiveTabAuth();
}
```

## Ограничения и рекомендации

### Размер данных

Chrome Storage Local имеет ограничение в 5MB. Текущая схема использует минимальный объем данных:

- purchaseState: ~200 байт
- lastSearch: ~150 байт  
- authStatus: ~50 байт

### Производительность

- Используйте batch операции для множественных обновлений
- Кэшируйте часто используемые данные в переменных
- Проверяйте актуальность данных по timestamp

### Безопасность

- Не храните чувствительные данные (пароли, токены)
- Валидируйте все входящие данные перед сохранением
- Используйте типизированные проверки для критических полей