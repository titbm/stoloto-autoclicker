# Справочник функций

## Обзор

Этот документ содержит подробное описание всех ключевых функций расширения "Столото Автокликер". Функции организованы по файлам и категориям для удобства навигации.

## popup.js - Функции интерфейса

### Функции авторизации

#### `checkAuthFromStorage()`
**Назначение:** Проверяет статус авторизации пользователя из Chrome Storage

**Сигнатура:**
```javascript
async function checkAuthFromStorage(): Promise<boolean>
```

**Параметры:** Нет

**Возвращаемое значение:** `boolean` - статус авторизации пользователя

**Описание:** 
- Проверяет кэшированный статус авторизации в Chrome Storage
- Если данные свежие (не старше 10 секунд), возвращает кэшированный статус
- При устаревших данных вызывает `checkActiveTabAuth()`
- Обрабатывает ошибки и возвращает `false` в случае проблем

**Пример использования:**
```javascript
const isAuthenticated = await checkAuthFromStorage();
if (isAuthenticated) {
    // Пользователь авторизован
    enablePurchaseMode();
}
```

#### `checkActiveTabAuth()`
**Назначение:** Проверяет авторизацию через активную вкладку со Столото

**Сигнатура:**
```javascript
async function checkActiveTabAuth(): Promise<boolean>
```

**Параметры:** Нет

**Возвращаемое значение:** `boolean` - статус авторизации

**Описание:**
- Отправляет сообщение content script для проверки авторизации
- Сохраняет полученный статус в Chrome Storage
- Устанавливает таймаут 1 секунда для предотвращения зависания
- Возвращает `false` при отсутствии активной вкладки или ошибках

#### `updateAuthDependentUI()`
**Назначение:** Обновляет элементы интерфейса в зависимости от статуса авторизации

**Сигнатура:**
```javascript
function updateAuthDependentUI(): void
```

**Параметры:** Нет

**Возвращаемое значение:** `void`

**Описание:**
- Включает/отключает чекбокс режима покупки
- Показывает/скрывает предупреждения об авторизации
- Сохраняет статус авторизации в Chrome Storage

### Функции управления балансом

#### `checkUserBalance(ticketsToBuy)`
**Назначение:** Проверяет достаточность средств пользователя для покупки билетов

**Сигнатура:**
```javascript
async function checkUserBalance(ticketsToBuy: number): Promise<{hasEnoughFunds: boolean, balance: number}>
```

**Параметры:**
- `ticketsToBuy` (number) - количество билетов для покупки

**Возвращаемое значение:** 
```javascript
{
    hasEnoughFunds: boolean, // достаточно ли средств
    balance: number         // текущий баланс пользователя
}
```

**Описание:**
- Сначала проверяет авторизацию пользователя
- Отправляет запрос content script для получения баланса
- Сравнивает баланс с требуемой суммой (ticketsToBuy * 150 руб.)
- Устанавливает таймаут 1.5 секунды

#### `showInsufficientFundsWarning(balance, ticketsToBuy)`
**Назначение:** Отображает предупреждение о недостаточности средств

**Сигнатура:**
```javascript
function showInsufficientFundsWarning(balance: number, ticketsToBuy: number): void
```

**Параметры:**
- `balance` (number) - текущий баланс пользователя
- `ticketsToBuy` (number) - количество билетов для покупки

**Возвращаемое значение:** `void`

**Описание:**
- Создает или обновляет элемент предупреждения
- Рассчитывает требуемую сумму (ticketsToBuy * 150)
- Применяет стили для визуального выделения предупреждения

#### `hideInsufficientFundsWarning()`
**Назначение:** Скрывает предупреждение о недостаточности средств

**Сигнатура:**
```javascript
function hideInsufficientFundsWarning(): void
```

**Параметры:** Нет

**Возвращаемое значение:** `void

### Функции управления данными

#### `saveSearchParams(numbers, excludeNumbers, mode, isPurchaseMode, ticketsToBuy)`
**Назначение:** Сохраняет параметры поиска в Chrome Storage

**Сигнатура:**
```javascript
async function saveSearchParams(
    numbers: number[], 
    excludeNumbers: number[], 
    mode: string, 
    isPurchaseMode: boolean, 
    ticketsToBuy: number
): Promise<void>
```

**Параметры:**
- `numbers` (number[]) - массив чисел для поиска
- `excludeNumbers` (number[]) - массив исключаемых чисел
- `mode` (string) - режим поиска ('anywhere', 'half', 'row')
- `isPurchaseMode` (boolean) - флаг режима покупки
- `ticketsToBuy` (number) - количество билетов для покупки

**Возвращаемое значение:** `Promise<void>`

**Описание:**
- Сохраняет все параметры поиска в объект `lastSearch`
- Добавляет временную метку для валидации данных

#### `loadLastSearchParams()`
**Назначение:** Загружает последние параметры поиска из Chrome Storage

**Сигнатура:**
```javascript
async function loadLastSearchParams(): Promise<void>
```

**Параметры:** Нет

**Возвращаемое значение:** `Promise<void>`

**Описание:**
- Восстанавливает поля ввода чисел и режим поиска
- Проверяет текущий статус авторизации
- Восстанавливает настройки режима покупки только для авторизованных пользователей

### Вспомогательные функции

#### `parseNumbers(input)`
**Назначение:** Парсит строку с числами в массив валидных чисел

**Сигнатура:**
```javascript
function parseNumbers(input: string): string[]
```

**Параметры:**
- `input` (string) - строка с числами, разделенными запятыми

**Возвращаемое значение:** `string[]` - массив валидных чисел

**Описание:**
- Разделяет строку по запятым
- Удаляет пробелы и фильтрует числа в диапазоне 1-90
- Возвращает только валидные числа

#### `removeDuplicateNumbers(numbers, excludeNumbers)`
**Назначение:** Удаляет дублирующиеся числа между полями поиска и исключений

**Сигнатура:**
```javascript
function removeDuplicateNumbers(numbers: string[], excludeNumbers: string[]): {
    hasDuplicates: boolean,
    duplicates: string[],
    filteredExcludeNumbers: string[]
}
```

**Параметры:**
- `numbers` (string[]) - числа для поиска
- `excludeNumbers` (string[]) - числа для исключения

**Возвращаемое значение:** Объект с информацией о дубликатах

**Описание:**
- Находит пересечения между массивами чисел
- Удаляет дубликаты из списка исключений
- Обновляет поле ввода и подсвечивает его

## content.js - Основная логика

### Функции управления состоянием

#### `savePurchaseState()`
**Назначение:** Сохраняет текущее состояние режима покупки в Chrome Storage

**Сигнатура:**
```javascript
async function savePurchaseState(): Promise<void>
```

**Параметры:** Нет

**Возвращаемое значение:** `Promise<void>`

**Описание:**
- Сохраняет все переменные состояния покупки
- Включает счетчики билетов, параметры поиска, временные метки
- Логирует сохраненное состояние для отладки

#### `loadPurchaseState()`
**Назначение:** Загружает состояние режима покупки из Chrome Storage

**Сигнатура:**
```javascript
async function loadPurchaseState(): Promise<void>
```

**Параметры:** Нет

**Возвращаемое значение:** `Promise<void>`

**Описание:**
- Восстанавливает все переменные состояния покупки
- Проверяет авторизацию перед продолжением покупки
- Автоматически продолжает незавершенную покупку
- Запускает поиск с задержкой 1.5 секунды для загрузки страницы

#### `resetPurchaseState()`
**Назначение:** Сбрасывает состояние режима покупки

**Сигнатура:**
```javascript
async function resetPurchaseState(): Promise<void>
```

**Параметры:** Нет

**Возвращаемое значение:** `Promise<void>`

**Описание:**
- Обнуляет все переменные состояния покупки
- Удаляет данные из Chrome Storage
- Логирует факт сброса состояния

### Функции авторизации

#### `isUserLoggedIn()`
**Назначение:** Определяет, авторизован ли пользователь на сайте Столото

**Сигнатура:**
```javascript
function isUserLoggedIn(): boolean
```

**Параметры:** Нет

**Возвращаемое значение:** `boolean` - статус авторизации

**Описание:**
- Использует 7 различных методов проверки авторизации:
  1. Поиск меню профиля
  2. Поиск аватара пользователя
  3. Поиск имени пользователя
  4. Поиск блока "Мой кабинет"
  5. Поиск элементов кошелька/баланса
  6. Проверка блока "Вход и регистрация"
  7. Поиск username/email
- Логирует результаты всех проверок
- Возвращает `false` при наличии блока входа/регистрации

#### `showAuthWarning()`
**Назначение:** Отображает предупреждение о необходимости авторизации

**Сигнатура:**
```javascript
function showAuthWarning(): void
```

**Параметры:** Нет

**Возвращаемое значение:** `void`

**Описание:**
- Создает фиксированный блок предупреждения в верхней части страницы
- Автоматически скрывает предупреждение через 5 секунд
- Применяет красный фон для привлечения внимания

### Основные функции поиска

#### `clickNumbers(numbers, mode, excludeNumbers)`
**Назначение:** Основная функция поиска и выбора билетов

**Сигнатура:**
```javascript
async function clickNumbers(numbers: number[], mode: string, excludeNumbers: number[] = []): Promise<void>
```

**Параметры:**
- `numbers` (number[]) - массив чисел для поиска
- `mode` (string) - режим поиска ('anywhere', 'half', 'row')
- `excludeNumbers` (number[]) - массив исключаемых чисел (по умолчанию пустой)

**Возвращаемое значение:** `Promise<void>`

**Описание:**
- Инициализирует поиск и обновляет блок состояния
- Выбирает числа на странице с случайными задержками (250-1000мс)
- Нажимает кнопку "Показать билеты"
- Запускает анализ билетов через `findSuitableTicket()`

#### `analyzeTicket(ticket, numbers)`
**Назначение:** Анализирует билет на соответствие критериям поиска

**Сигнатура:**
```javascript
function analyzeTicket(ticket: Element, numbers: number[]): boolean
```

**Параметры:**
- `ticket` (Element) - DOM элемент билета
- `numbers` (number[]) - числа для поиска

**Возвращаемое значение:** `boolean` - соответствует ли билет критериям

**Описание:**
- Извлекает числа из билета по селекторам `[data-test-id="number"]` и `[data-test-id="selected-number"]`
- Группирует числа по строкам (по 9 чисел в строке, 6 строк всего)
- Проверяет отсутствие исключаемых чисел
- Применяет логику поиска в зависимости от режима:
  - `'row'`: все числа в одной строке
  - `'half'`: все числа в одной половине (строки 1-3 или 4-6)
  - `'anywhere'`: числа где угодно в билете

### Вспомогательные функции

#### `updateStatusBlock(numbers, excludeNumbers, mode)`
**Назначение:** Создает или обновляет блок состояния поиска

**Сигнатура:**
```javascript
function updateStatusBlock(numbers: number[], excludeNumbers: number[], mode: string): void
```

**Параметры:**
- `numbers` (number[]) - числа для поиска
- `excludeNumbers` (number[]) - исключаемые числа
- `mode` (string) - режим поиска

**Возвращаемое значение:** `void`

**Описание:**
- Создает фиксированный блок в верхней части страницы
- Отображает параметры поиска, счетчики билетов, время поиска
- В режиме покупки показывает прогресс покупки
- Меняет цвет на зеленый при завершении

#### `removeStatusBlock()`
**Назначение:** Удаляет блок состояния поиска

**Сигнатура:**
```javascript
function removeStatusBlock(): void
```

**Параметры:** Нет

**Возвращаемое значение:** `void`

#### `formatSearchTime()`
**Назначение:** Форматирует время поиска в читаемый вид

**Сигнатура:**
```javascript
function formatSearchTime(): string
```

**Параметры:** Нет

**Возвращаемое значение:** `string` - отформатированное время (например, "2м 30с")

**Описание:**
- Рассчитывает разность между текущим временем и `searchStartTime`
- Конвертирует в минуты и секунды
- Возвращает пустую строку если `searchStartTime` не установлен

#### `clearSelection()`
**Назначение:** Очищает выбранные числа на странице

**Сигнатура:**
```javascript
async function clearSelection(): Promise<boolean>
```

**Параметры:** Нет

**Возвращаемое значение:** `Promise<boolean>` - успешность операции

**Описание:**
- Ищет кнопку "Очистить" по тексту
- Нажимает на кнопку и ждет 500мс
- Возвращает `true` при успехе, `false` при отсутствии кнопки

#### `checkPaymentButtons()`
**Назначение:** Проверяет наличие кнопок оплаты на странице

**Сигнатура:**
```javascript
function checkPaymentButtons(): {walletPaymentAvailable: boolean, qrPaymentAvailable: boolean}
```

**Параметры:** Нет

**Возвращаемое значение:** Объект с флагами доступности способов оплаты

**Описание:**
- Ищет кнопки "Оплатить кошельком" и "Оплатить по QR"
- Возвращает объект с булевыми флагами доступности каждого способа

## event_page.js - Фоновый скрипт

### Обработчики событий

#### `chrome.action.onClicked` обработчик
**Назначение:** Обрабатывает клик по иконке расширения

**Сигнатура:**
```javascript
chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => void)
```

**Параметры:**
- `tab` (chrome.tabs.Tab) - объект активной вкладки

**Возвращаемое значение:** `void`

**Описание:**
- Проверяет URL текущей вкладки
- Если вкладка уже на рабочей странице Столото, открывает popup
- Иначе создает новую вкладку с рабочей страницей
- Сбрасывает popup для корректной работы при следующем клике

## Глобальные переменные состояния

### popup.js
```javascript
let isSearching = false;           // Флаг активного поиска
let isUserAuthenticated = false;   // Статус авторизации
const TICKET_PRICE = 150;         // Стоимость одного билета в рублях
```

### content.js
```javascript
// Основные переменные поиска
let isSearching = false;
let searchMode = 'half';
let ticketsChecked = 0;
let searchStartTime = null;

// Переменные режима покупки
let isPurchaseMode = false;
let totalTicketsToBuy = 0;
let ticketsPurchased = 0;
let purchaseSearchNumbers = [];
let purchaseExcludeNumbers = [];
let purchaseSearchMode = 'half';
let purchaseTicketsChecked = 0;
let purchaseStartTime = null;
```

## Константы и конфигурация

### Стили интерфейса
```javascript
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
```

### URL конфигурация
```javascript
const workPageUrl = 'https://www.stoloto.ru/ruslotto/game?viewType=favorite';
```

## Обработка сообщений Chrome Runtime

### content.js - Слушатель сообщений
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Обработка различных действий:
    // - 'clickNumbers': запуск поиска билетов
    // - 'stopSearch': остановка поиска
    // - 'checkUserLogin': проверка авторизации
    // - 'checkUserBalance': проверка баланса
});
```

## Примеры использования

### Запуск поиска билетов
```javascript
// Из popup.js
chrome.tabs.sendMessage(activeTab.id, {
    action: 'clickNumbers',
    numbers: [1, 5, 10, 15, 20],
    excludeNumbers: [7, 13],
    mode: 'half',
    isPurchaseMode: true,
    ticketsToBuy: 3
});
```

### Проверка авторизации
```javascript
// Из popup.js
chrome.tabs.sendMessage(tab.id, 
    { action: 'checkUserLogin' }, 
    (response) => {
        if (response && response.isLoggedIn) {
            // Пользователь авторизован
        }
    }
);
```

### Проверка баланса
```javascript
// Из popup.js
chrome.tabs.sendMessage(tab.id, 
    { action: 'checkUserBalance', ticketsToBuy: 5 }, 
    (response) => {
        if (response && response.hasEnoughFunds) {
            // Достаточно средств для покупки
        }
    }
);
```