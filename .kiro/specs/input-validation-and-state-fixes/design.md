# Design Document

## Overview

Данный дизайн направлен на исправление трех критических проблем в расширении Столото Автокликер:

1. **Улучшение валидации пользовательского ввода** - добавление поддержки пробелов как разделителей и блокировка недопустимых символов
2. **Контроль состояния загрузки страницы** - предотвращение запуска поиска до полной загрузки страницы
3. **Восстановление контроля над активным поиском** - возможность остановки поиска после повторного открытия popup

## Architecture

Архитектура решения основана на существующей модульной структуре расширения:

- **popup.js** - основная логика интерфейса, валидация ввода, управление состоянием кнопок
- **content.js** - точка входа, координация модулей
- **modules/main.js** - обработка сообщений, координация поиска
- **modules/state.js** - управление состоянием поиска и покупки
- **Chrome Storage API** - синхронизация состояния между popup и content script

## Components and Interfaces

### 1. Input Validation Component (popup.js)

**Функции:**
- `parseNumbers(input)` - модифицированная функция парсинга чисел
- `validateInput(event)` - новая функция валидации ввода в реальном времени
- `sanitizeInput(value)` - новая функция очистки ввода от недопустимых символов

**Интерфейс:**
```javascript
// Модифицированная функция parseNumbers
function parseNumbers(input) {
    // Поддержка как запятых, так и пробелов как разделителей
    return input.split(/[,\s]+/)
        .map(num => num.trim())
        .filter(num => {
            const n = parseInt(num);
            return !isNaN(n) && n >= 1 && n <= 90;
        });
}

// Новая функция валидации ввода
function validateInput(event) {
    // Разрешены только цифры, пробелы и запятые
    const allowedPattern = /^[0-9,\s]*$/;
    // Блокировка недопустимых символов
}

// Новая функция очистки ввода
function sanitizeInput(value) {
    // Удаление всех символов кроме цифр, пробелов и запятых
    return value.replace(/[^0-9,\s]/g, '');
}
```

### 2. Page Load State Component (popup.js + content.js)

**Функции:**
- `checkPageLoadState()` - новая функция проверки состояния загрузки страницы
- `updateButtonState()` - новая функция управления состоянием кнопки "Запустить"
- `isStolotoPageReady()` - новая функция проверки готовности страницы Столото

**Интерфейс:**
```javascript
// Проверка состояния загрузки страницы
async function checkPageLoadState() {
    // Проверка через chrome.tabs.sendMessage
    // Возвращает { isReady: boolean, isStolotoPage: boolean }
}

// Управление состоянием кнопки
function updateButtonState(isReady) {
    button.disabled = !isReady;
}

// Проверка готовности страницы Столото (в content.js)
function isStolotoPageReady() {
    // Проверка наличия ключевых элементов страницы
    return document.readyState === 'complete' && 
           document.querySelector('button') !== null;
}
```

### 3. Search State Recovery Component (popup.js + modules/state.js)

**Функции:**
- `checkActiveSearch()` - новая функция проверки активного поиска
- `restoreSearchControl()` - новая функция восстановления контроля над поиском
- `syncSearchState()` - новая функция синхронизации состояния

**Интерфейс:**
```javascript
// Проверка активного поиска
async function checkActiveSearch() {
    // Проверка состояния через Chrome Storage
    // Возвращает { isActive: boolean, searchData: object }
}

// Восстановление контроля над поиском
function restoreSearchControl(searchData) {
    // Обновление интерфейса popup для отображения кнопки "Остановить"
    isSearching = true;
    button.textContent = 'Остановить';
    button.classList.remove('start');
    button.classList.add('stop');
}

// Синхронизация состояния (в modules/state.js)
async function syncSearchState() {
    // Сохранение текущего состояния поиска в Chrome Storage
    await chrome.storage.local.set({
        activeSearch: {
            isSearching: window.stolotoState.isSearching,
            timestamp: Date.now()
        }
    });
}
```

## Data Models

### Input Validation Data Model
```javascript
{
    rawInput: string,           // Исходный ввод пользователя
    sanitizedInput: string,     // Очищенный ввод
    parsedNumbers: number[],    // Распарсенные числа
    validationErrors: string[]  // Ошибки валидации
}
```

### Page Load State Data Model
```javascript
{
    isReady: boolean,          // Готовность страницы
    isStolotoPage: boolean,    // Является ли страница сайтом Столото
    loadTimestamp: number      // Время последней проверки
}
```

### Search State Data Model
```javascript
{
    isSearching: boolean,      // Активен ли поиск
    searchStartTime: number,   // Время начала поиска
    searchParams: {            // Параметры поиска
        numbers: number[],
        excludeNumbers: number[],
        mode: string
    },
    timestamp: number          // Время последнего обновления
}
```

## Error Handling

### Input Validation Errors
- **Недопустимые символы**: Блокировка ввода на уровне события `input`
- **Числа вне диапазона**: Отображение предупреждения без блокировки функциональности
- **Пустой ввод**: Предотвращение запуска поиска без уведомлений

### Page Load Errors
- **Страница не загружена**: Блокировка кнопки "Запустить" без уведомлений
- **Не страница Столото**: Обработка через существующий механизм перенаправления
- **Ошибка связи с content script**: Graceful degradation с блокировкой кнопки

### Search State Errors
- **Потеря состояния**: Восстановление из Chrome Storage при открытии popup
- **Конфликт состояний**: Приоритет данных из content script над popup
- **Ошибка синхронизации**: Логирование ошибки без прерывания работы

## Testing Strategy

### Manual Testing Scenarios
1. **Ввод чисел через пробелы**: Проверка корректного парсинга
2. **Ввод недопустимых символов**: Проверка блокировки ввода
3. **Быстрое нажатие Запустить/Остановить**: Проверка отсутствия системных сообщений
4. **Закрытие и открытие popup во время поиска**: Проверка восстановления контроля

## Implementation Notes

### Backward Compatibility
- Существующая функция `parseNumbers()` будет модифицирована с сохранением обратной совместимости
- Новые функции будут добавлены без изменения существующих интерфейсов
- Chrome Storage будет использоваться для новых данных без конфликта с существующими ключами

### Performance Considerations
- Валидация ввода будет выполняться с debounce для предотвращения избыточных вызовов
- Проверка состояния загрузки страницы будет кэшироваться на короткое время
- Синхронизация состояния поиска будет происходить только при изменениях

### Security Considerations
- Валидация ввода предотвратит инъекцию вредоносного кода
- Санитизация ввода будет происходить на клиентской стороне
- Состояние поиска будет храниться только локально в расширении