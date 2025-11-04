# Архитектура расширения (v2.0)

## Обзор

Полностью переписанная архитектура с правильным разделением ответственности:
- **Background Service Worker** - единый источник истины, управляет всей логикой
- **Content Script** - тонкий адаптер, только выполняет команды
- **DOM Adapter** - изолированная работа с DOM
- **Popup** - UI, отправляет команды в background

## Структура файлов

```
background.js (300+ строк)
├── Управление сеансами (Map<tabId, session>)
├── Хранение данных (sync/session/local)
├── Логика поиска (пинг-понг с content)
└── Анализ билетов

content.js (80 строк)
├── Слушает команды от background
├── Вызывает DOM Adapter
└── Отправляет результаты обратно

modules/dom-adapter.js (200 строк)
└── ВСЯ работа с DOM изолирована здесь

popup.js (800+ строк)
└── UI + отправка команд в background
```

## Хранение данных

### 1. chrome.storage.sync (Настройки пользователя)

**Что храним:**
```javascript
{
  userPreferences: {
    lastSearchNumbers: [1, 2, 3],
    lastExcludeNumbers: [10, 20],
    lastSearchMode: 'half',
    lastTicketsToBuy: 5
  }
}
```

**Зачем:**
- Синхронизируется между устройствами
- Переживает переустановку
- Удобство для пользователя

### 2. chrome.storage.session (Состояние покупки)

**Что храним:**
```javascript
{
  purchase_123: {
    tabId: 123,
    isPurchaseMode: true,
    totalTicketsToBuy: 10,
    ticketsPurchased: 3,
    searchNumbers: [1, 2, 3],
    ticketsChecked: 150,
    startTime: 1234567890
  }
}
```

**Зачем:**
- Переживает перезагрузку страницы
- Автоматически удаляется при закрытии вкладки
- Fallback на local storage для старых версий Chrome

### 3. Background Memory (Map)

**Что храним:**
```javascript
activeSessions = Map {
  123 => {
    tabId: 123,
    isSearching: true,
    numbers: [1, 2, 3],
    excludeNumbers: [10],
    mode: 'half',
    isPurchaseMode: false,
    ticketsChecked: 50,
    startTime: 1234567890
  },
  456 => { ... }
}
```

**Зачем:**
- Мгновенный доступ
- Каждая вкладка имеет свою сессию
- Не теряется пока service worker активен

## Поток данных (Пинг-понг архитектура)

### Запуск поиска

```
1. Popup
   ↓ chrome.runtime.sendMessage('startSearch')
   
2. Background
   ↓ createSession(tabId, params)
   ↓ saveUserPreferences() → chrome.storage.sync
   ↓ savePurchaseState() → chrome.storage.session
   ↓ startSearchProcess(tabId)
   
3. Background → Content
   ↓ sendCommand('clearSelection')
   ↓ sendCommand('openModal')
   ↓ sendCommand('selectNumbers')
   ↓ sendCommand('showTickets')
   ↓ sendCommand('scanPage')
   
4. Content → Background
   ↓ { success: true, tickets: [...] }
   
5. Background
   ↓ analyzeTicket() для каждого билета
   ↓ если нашли → handleFoundTickets()
   ↓ если нет → loadNextPageAndContinue()
```

### Множественные вкладки

```
Background Service Worker
├── Session 123: { numbers: [1,2,3], ticketsChecked: 50 }
│   ↓ пинг-понг с content в вкладке 123
│
├── Session 456: { numbers: [10,20,30], ticketsChecked: 100 }
│   ↓ пинг-понг с content в вкладке 456
│
└── Session 789: { numbers: [5,15,25], ticketsChecked: 25 }
    ↓ пинг-понг с content в вкладке 789
```

Каждая вкладка работает **полностью независимо**.

### Закрытие вкладки

```
chrome.tabs.onRemoved(tabId)
  ↓
deleteSession(tabId)
  ↓ clearPurchaseState() → удаляет из chrome.storage.session
  ↓ activeSessions.delete(tabId)
```

## Изоляция парсинга DOM

**Проблема:** Столото часто меняет верстку.

**Решение:** Весь парсинг в одном файле `modules/dom-adapter.js`

```javascript
class StolotoDOMAdapter {
  extractTickets()           // Парсит билеты
  clickTicket(id)            // Кликает по билету
  clickButton(text)          // Кликает по кнопке
  openNumberModal()          // Открывает модалку
  selectNumbers(numbers)     // Выбирает числа
  showTickets()              // Показывает билеты
  loadNextPage()             // Следующая страница
  isUserLoggedIn()           // Проверка авторизации
  getUserBalance()           // Получение баланса
}
```

**Когда Столото поменяет верстку:**
- Правим **только** `dom-adapter.js`
- `content.js` не трогаем
- `background.js` не трогаем
- `popup.js` не трогаем

## Преимущества новой архитектуры

1. ✅ **Множественные сеансы** - каждая вкладка независима
2. ✅ **Персистентность** - состояние покупки переживает перезагрузку
3. ✅ **Чистота** - автоматическая очистка при закрытии вкладки
4. ✅ **UX** - настройки синхронизируются между устройствами
5. ✅ **Изоляция DOM** - легко адаптироваться к изменениям сайта
6. ✅ **Тестируемость** - логика отделена от DOM
7. ✅ **Масштабируемость** - легко добавлять новые команды

## Сравнение со старой архитектурой

### Было (плохо)

```
content.js
├── window.stolotoState (глобальное состояние)
├── modules/search.js (300+ строк смешанной логики)
├── modules/main.js (200+ строк)
└── Всё в одной вкладке, теряется при перезагрузке
```

**Проблемы:**
- ❌ Состояние теряется при перезагрузке
- ❌ Нельзя запустить несколько поисков
- ❌ Парсинг DOM размазан по файлам
- ❌ Логика смешана с DOM

### Стало (хорошо)

```
background.js (логика)
  ↕ пинг-понг
content.js (адаптер)
  ↓ использует
dom-adapter.js (DOM)
```

**Преимущества:**
- ✅ Состояние в background (не теряется)
- ✅ Множественные вкладки
- ✅ Парсинг DOM изолирован
- ✅ Логика отделена от DOM

## Технический долг

См. `TECH_DEBT.md` для списка компромиссов.

## Тестирование

См. `READY_TO_TEST.md` для инструкций по тестированию.
