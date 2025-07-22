# Жизненный цикл состояний приложения

## Обзор

Расширение "Столото Автокликер" управляет несколькими типами состояний, которые изменяются в зависимости от действий пользователя и результатов поиска. Понимание жизненного цикла состояний критически важно для корректной работы приложения и восстановления после перезагрузки страницы.

## Состояния поиска

### Основные состояния

#### not_started
- **Описание**: Начальное состояние, поиск не запущен
- **Условия активации**: 
  - При загрузке расширения
  - После завершения предыдущего поиска
  - После остановки поиска пользователем
- **Индикаторы**: 
  - `isSearching = false`
  - Кнопка "Запустить" активна
  - Отсутствует блок статуса поиска

#### searching
- **Описание**: Активный процесс поиска билетов
- **Условия активации**:
  - Пользователь нажал кнопку "Запустить"
  - Успешно выбраны числа и нажата кнопка "Показать билеты"
- **Индикаторы**:
  - `isSearching = true`
  - Кнопка "Остановить" активна
  - Отображается блок статуса с информацией о поиске
  - Увеличивается счетчик `ticketsChecked`

#### found
- **Описание**: Найден подходящий билет, но процесс еще не завершен
- **Условия активации**:
  - Функция `analyzeTicket()` вернула `true` для билета
  - В обычном режиме: билет выбран, но статус еще не обновлен
  - В режиме покупки: билет найден, но покупка еще не завершена
- **Индикаторы**:
  - `isSearching = true` (еще активен)
  - Билет выделен на странице
  - В режиме покупки: отображаются кнопки оплаты

#### completed
- **Описание**: Поиск успешно завершен
- **Условия активации**:
  - В обычном режиме: найден и выбран подходящий билет
  - В режиме покупки: достигнут лимит купленных билетов
- **Индикаторы**:
  - `isSearching = false`
  - Блок статуса зеленого цвета
  - Кнопка "Запустить" снова активна
  - В режиме покупки: `ticketsPurchased >= totalTicketsToBuy`

### Диаграмма переходов состояний поиска

```
not_started → searching → found → completed
     ↑           ↓         ↓         ↓
     └───────────┴─────────┴─────────┘
           (остановка пользователем)
```

## Состояния покупки

### Основные состояния

#### idle
- **Описание**: Режим покупки неактивен
- **Условия активации**:
  - Чекбокс режима покупки не отмечен
  - Пользователь не авторизован
  - Завершена покупка всех запланированных билетов
- **Индикаторы**:
  - `isPurchaseMode = false`
  - `totalTicketsToBuy = 0`
  - `ticketsPurchased = 0`

#### purchasing
- **Описание**: Активный процесс поиска и покупки билетов
- **Условия активации**:
  - Пользователь авторизован и активировал режим покупки
  - `ticketsPurchased < totalTicketsToBuy`
  - Найден подходящий билет и доступны кнопки оплаты
- **Индикаторы**:
  - `isPurchaseMode = true`
  - Отображается прогресс покупки в блоке статуса
  - Активны функции `savePurchaseState()` и `loadPurchaseState()`

#### payment
- **Описание**: Процесс оплаты билета
- **Условия активации**:
  - Найден подходящий билет
  - Нажата кнопка "Оплатить кошельком"
  - Ожидается подтверждение оплаты
- **Индикаторы**:
  - Отображаются кнопки оплаты
  - Выполняется задержка 5 секунд для обработки оплаты
  - Блок статуса показывает процесс оплаты

#### completed
- **Описание**: Покупка всех запланированных билетов завершена
- **Условия активации**:
  - `ticketsPurchased >= totalTicketsToBuy`
  - Все билеты успешно оплачены
- **Индикаторы**:
  - Блок статуса зеленого цвета с сообщением о завершении
  - Вызывается `resetPurchaseState()`
  - Состояние покупки очищается из Chrome Storage

### Диаграмма переходов состояний покупки

```
idle → purchasing → payment → completed
 ↑         ↓          ↓          ↓
 └─────────┴──────────┴──────────┘
      (сброс состояния)
```

## Условия перехода состояний

### Триггеры изменения состояний

#### Пользовательские действия
- **Нажатие "Запустить"**: `not_started` → `searching`
- **Нажатие "Остановить"**: `searching` → `not_started`
- **Активация режима покупки**: `idle` → `purchasing`
- **Деактивация режима покупки**: `purchasing` → `idle`

#### Системные события
- **Найден подходящий билет**: `searching` → `found`
- **Билет успешно выбран**: `found` → `completed` (обычный режим)
- **Билет успешно оплачен**: `payment` → `purchasing` (если нужны еще билеты)
- **Достигнут лимит покупок**: `purchasing` → `completed`

#### Ошибки и исключения
- **Потеря авторизации**: `purchasing` → `idle`
- **Недостаток средств**: `purchasing` → `idle`
- **Ошибка сети**: любое состояние → `not_started`

### Валидация переходов

```javascript
function validateStateTransition(currentState, newState, context) {
    // Проверка авторизации для режима покупки
    if (newState === 'purchasing' && !isUserLoggedIn()) {
        console.log('❌ Переход в режим покупки невозможен: пользователь не авторизован');
        return false;
    }
    
    // Проверка достаточности средств
    if (newState === 'payment' && !hasEnoughFunds(context.ticketsToBuy)) {
        console.log('❌ Переход к оплате невозможен: недостаточно средств');
        return false;
    }
    
    return true;
}
```

## Восстановление состояния после перезагрузки

### Процедура восстановления

#### При загрузке content.js

1. **Загрузка состояния покупки**:
   ```javascript
   async function loadPurchaseState() {
       const data = await chrome.storage.local.get('purchaseState');
       if (data.purchaseState) {
           // Восстанавливаем все переменные состояния
           isPurchaseMode = data.purchaseState.isPurchaseMode;
           totalTicketsToBuy = data.purchaseState.totalTicketsToBuy;
           ticketsPurchased = data.purchaseState.ticketsPurchased;
           // ...
       }
   }
   ```

2. **Проверка актуальности авторизации**:
   ```javascript
   if (isPurchaseMode && !isUserLoggedIn()) {
       console.log('❌ Пользователь вышел из аккаунта, отменяем режим покупки');
       await resetPurchaseState();
       return;
   }
   ```

3. **Продолжение процесса**:
   ```javascript
   if (isPurchaseMode && ticketsPurchased < totalTicketsToBuy) {
       // Восстанавливаем счетчики и время
       ticketsChecked = purchaseTicketsChecked;
       searchStartTime = purchaseStartTime;
       
       // Продолжаем поиск с задержкой
       setTimeout(() => {
           clearSelection().then(() => {
               clickNumbers(purchaseSearchNumbers, purchaseSearchMode, purchaseExcludeNumbers);
           });
       }, 1500);
   }
   ```

#### При загрузке popup.js

1. **Проверка авторизации**:
   ```javascript
   await checkAuthFromStorage();
   updateAuthDependentUI();
   ```

2. **Восстановление параметров поиска**:
   ```javascript
   await loadLastSearchParams();
   ```

3. **Валидация режима покупки**:
   ```javascript
   if (data.lastSearch.isPurchaseMode && currentAuthStatus) {
       testPurchaseModeCheckbox.checked = true;
       purchaseOptionsContainer.style.display = 'block';
   }
   ```

### Обработка конфликтов состояний

#### Конфликт авторизации
```javascript
// Если режим покупки активен, но пользователь не авторизован
if (isPurchaseMode && !isUserLoggedIn()) {
    showAuthWarning();
    await resetPurchaseState();
}
```

#### Конфликт временных меток
```javascript
// Проверка актуальности данных авторизации
const isRecent = (Date.now() - data.authStatus.timestamp) < 10 * 1000;
if (!isRecent) {
    // Запрашиваем актуальный статус
    return await checkActiveTabAuth();
}
```

#### Конфликт состояния покупки
```javascript
// Если покупка уже завершена, но состояние не сброшено
if (ticketsPurchased >= totalTicketsToBuy) {
    await resetPurchaseState();
    return;
}
```

## Отладка состояний

### Логирование переходов

```javascript
function logStateTransition(from, to, reason) {
    console.log(`🔄 Переход состояния: ${from} → ${to} (${reason})`);
    
    // Сохраняем в Chrome Storage для отладки
    chrome.storage.local.set({
        lastStateTransition: {
            from: from,
            to: to,
            reason: reason,
            timestamp: Date.now()
        }
    });
}
```

### Мониторинг состояний

```javascript
function monitorStates() {
    setInterval(() => {
        console.log('📊 Текущие состояния:', {
            isSearching: isSearching,
            isPurchaseMode: isPurchaseMode,
            ticketsPurchased: ticketsPurchased,
            totalTicketsToBuy: totalTicketsToBuy,
            ticketsChecked: ticketsChecked
        });
    }, 5000);
}
```

### Диагностика проблем

#### Зависшее состояние поиска
```javascript
// Если поиск активен более 10 минут без изменений
if (isSearching && (Date.now() - searchStartTime) > 10 * 60 * 1000) {
    console.log('⚠️ Обнаружено зависшее состояние поиска');
    // Принудительный сброс
    isSearching = false;
    removeStatusBlock();
}
```

#### Некорректное состояние покупки
```javascript
// Проверка логической целостности
if (isPurchaseMode && totalTicketsToBuy === 0) {
    console.log('⚠️ Некорректное состояние покупки: режим активен, но лимит не установлен');
    await resetPurchaseState();
}
```

## Рекомендации по управлению состояниями

### Best Practices

1. **Всегда проверяйте предусловия** перед переходом в новое состояние
2. **Используйте атомарные операции** для критических изменений состояния
3. **Логируйте все переходы состояний** для упрощения отладки
4. **Валидируйте состояние** после восстановления из Chrome Storage
5. **Предусматривайте откат** для каждого перехода состояния

### Антипаттерны

1. **Не изменяйте состояние** без проверки текущего контекста
2. **Не полагайтесь на порядок** асинхронных операций
3. **Не игнорируйте ошибки** при сохранении/загрузке состояния
4. **Не создавайте циклические зависимости** между состояниями
5. **Не забывайте очищать** временные состояния после завершения операций