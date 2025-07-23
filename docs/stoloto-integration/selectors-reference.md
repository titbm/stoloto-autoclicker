# Справочник селекторов сайта Столото

## Обзор

Данный документ содержит актуальные CSS селекторы для всех элементов интерфейса сайта Столото, необходимых для работы расширения. Селекторы проверены на странице `https://www.stoloto.ru/ruslotto/game?viewType=favorite`.

## Статус селекторов

### ✅ Работающие селекторы

Эти селекторы актуальны и работают корректно:

#### Числа для выбора (1-90)

```css
/* Все кнопки чисел */
[data-test-id="number"]

/* Контейнер со всеми числами */
[data-test-id="number-list"]
```

**JavaScript селекция:**
```javascript
// Все кнопки чисел
const numberButtons = document.querySelectorAll('[data-test-id="number"]');

// Конкретное число по тексту
const numberButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === targetNumber.toString()
);

// Конкретное число по data-test-id (если есть дополнительные атрибуты)
const numberButton = document.querySelector(`[data-test-id="number"][data-number="${targetNumber}"]`);
```

#### Кнопки управления

```css
/* Кнопка "Показать билеты" */
button /* поиск по тексту */

/* Кнопка "Сбросить" */
button /* поиск по тексту */
```

**JavaScript селекция:**
```javascript
// Кнопка "Показать билеты"
const showTicketsButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Показать билеты'
);

// Кнопка "Сбросить" 
const resetButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Сбросить'
);
```

#### Авторизация

```css
/* Ссылка на авторизацию (неавторизованное состояние) */
a[href*="/auth"]

/* Ссылка на баланс (авторизованное состояние) */
a[href="/private/wallet?int=header"]

/* Ссылка на бонусы (авторизованное состояние) */
a[href="/private/bonus?int=header"]

/* Ссылка на мои билеты (авторизованное состояние) */
a[href="/private/tickets/all?int=header"]
```

### ⚠️ Частично работающие селекторы

Эти селекторы работают только после определенных действий:

#### Билеты (появляются после нажатия "Показать билеты")

```css
/* Селекторы, которые работают только после загрузки билетов */
[data-test-id="ticket-number"]     /* Номера билетов */
[data-test-id="selected-number"]   /* Выбранные числа в билетах */
button[class*="Ticket_btn"]        /* Кнопки билетов */
```

#### Кнопка "Другие билеты"

```javascript
// Появляется только после загрузки билетов
const otherTicketsButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Другие билеты'
);
```

### ❌ Неработающие селекторы

Эти селекторы из старого кода больше не работают:

```css
/* Устаревшие селекторы */
[data-test-id="show-tickets"]      /* Не существует */
[data-test-id="other-tickets"]     /* Не существует */
button[data-test-id="clear"]       /* Не существует */
```

## Актуальные селекторы по категориям

### Выбор чисел

#### Кнопки чисел (1-90)

```javascript
// Рекомендуемый способ - через data-test-id
const allNumberButtons = document.querySelectorAll('[data-test-id="number"]');

// Альтернативный способ - через текст
const numberButton = Array.from(document.querySelectorAll('button')).find(btn => {
  const text = btn.textContent.trim();
  return /^\d+$/.test(text) && parseInt(text) >= 1 && parseInt(text) <= 90;
});

// Поиск конкретного числа
function findNumberButton(number) {
  return Array.from(document.querySelectorAll('[data-test-id="number"]')).find(btn => 
    btn.textContent.trim() === number.toString()
  );
}
```

#### Активные (выбранные) числа

```javascript
// Активные кнопки чисел имеют атрибут [active]
const activeNumbers = document.querySelectorAll('[data-test-id="number"][active]');

// Получение списка выбранных чисел
function getSelectedNumbers() {
  return Array.from(document.querySelectorAll('[data-test-id="number"][active]'))
    .map(btn => parseInt(btn.textContent.trim()))
    .filter(num => !isNaN(num));
}
```

### Управление выбором

#### Кнопка сброса

```javascript
// Кнопка "Сбросить"
const resetButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Сбросить'
);

// Функция очистки выбора
async function clearSelection() {
  const clearButton = resetButton;
  if (clearButton) {
    clearButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
  return false;
}
```

#### Кнопка показа билетов

```javascript
// Кнопка "Показать билеты" (появляется после выбора чисел)
const showTicketsButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Показать билеты'
);

// Проверка доступности кнопки
function isShowTicketsAvailable() {
  return !!Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.trim() === 'Показать билеты'
  );
}
```

### Работа с билетами

#### Поиск билетов

```javascript
// Все билеты (после загрузки)
const tickets = Array.from(document.querySelectorAll('button')).filter(btn => 
  btn.textContent.includes('Билет №')
);

// Альтернативный способ через класс (если доступен)
const ticketsAlt = document.querySelectorAll('button[class*="Ticket_btn"]');
```

#### Номера билетов

```javascript
// Получение номера билета
function getTicketNumber(ticketButton) {
  // Способ 1: через data-test-id (если доступен)
  const numberElement = ticketButton.querySelector('[data-test-id="ticket-number"]');
  if (numberElement) {
    return numberElement.textContent.trim();
  }
  
  // Способ 2: через текстовое содержимое
  const match = ticketButton.textContent.match(/Билет №(\d+)/);
  return match ? match[1] : null;
}
```

#### Числа в билете

```javascript
// Получение всех чисел из билета
function getTicketNumbers(ticketButton) {
  // Способ 1: через data-test-id (предпочтительный)
  const numberElements = ticketButton.querySelectorAll('[data-test-id="number"], [data-test-id="selected-number"]');
  if (numberElements.length > 0) {
    return Array.from(numberElements)
      .map(el => parseInt(el.textContent.trim()))
      .filter(num => !isNaN(num));
  }
  
  // Способ 2: через все generic элементы с числами
  const allElements = ticketButton.querySelectorAll('generic');
  return Array.from(allElements)
    .map(el => el.textContent.trim())
    .filter(text => /^\d+$/.test(text))
    .map(text => parseInt(text))
    .filter(num => num >= 1 && num <= 90);
}

// Группировка чисел по строкам (6 строк по 5 чисел)
function groupTicketNumbersByRows(numbers) {
  const rows = [];
  for (let i = 0; i < numbers.length; i += 5) {
    rows.push(numbers.slice(i, i + 5));
  }
  return rows;
}
```

#### Навигация по билетам

```javascript
// Кнопка "Другие билеты"
const otherTicketsButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Другие билеты'
);

// Проверка доступности навигации
function isOtherTicketsAvailable() {
  return !!Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.trim() === 'Другие билеты'
  );
}
```

### Авторизация и баланс

#### Проверка статуса авторизации

```javascript
// Проверка авторизации пользователя
function isUserLoggedIn() {
  // Проверяем наличие ссылки на авторизацию (неавторизованное состояние)
  const authLink = document.querySelector('a[href*="/auth"]');
  if (authLink && authLink.textContent.includes('Вход и регистрация')) {
    return false;
  }
  
  // Проверяем наличие элементов авторизованного пользователя
  const walletLink = document.querySelector('a[href="/private/wallet?int=header"]');
  const bonusLink = document.querySelector('a[href="/private/bonus?int=header"]');
  
  return !!(walletLink || bonusLink);
}
```

#### Получение баланса

```javascript
// Получение баланса пользователя
function getUserBalance() {
  const balanceLink = document.querySelector('a[href="/private/wallet?int=header"]');
  if (balanceLink) {
    const balanceText = balanceLink.textContent.trim();
    // Извлекаем число из текста "X ₽"
    const match = balanceText.match(/(\d+(?:\s\d+)*)\s*₽/);
    return match ? parseInt(match[1].replace(/\s/g, '')) : 0;
  }
  return null; // Пользователь не авторизован
}

// Получение количества бонусов
function getUserBonuses() {
  const bonusLink = document.querySelector('a[href="/private/bonus?int=header"]');
  if (bonusLink) {
    const bonusText = bonusLink.textContent.trim();
    const bonusNumber = parseInt(bonusText);
    return isNaN(bonusNumber) ? 0 : bonusNumber;
  }
  return null; // Пользователь не авторизован
}
```

### Покупка билетов

#### Кнопки оплаты

```javascript
// Поиск кнопок оплаты (появляются после выбора билетов)
function checkPaymentButtons() {
  const allButtons = Array.from(document.querySelectorAll('button'));
  
  const walletPaymentButton = allButtons.find(btn => 
    btn.textContent.includes('Оплатить кошельком')
  );
  
  const qrPaymentButton = allButtons.find(btn => 
    btn.textContent.includes('QR') || btn.textContent.includes('СБП')
  );
  
  return {
    walletPaymentAvailable: !!walletPaymentButton,
    qrPaymentAvailable: !!qrPaymentButton,
    walletButton: walletPaymentButton,
    qrButton: qrPaymentButton
  };
}
```

## Рекомендации по использованию

### Приоритет селекторов

1. **Первый приоритет**: `data-test-id` атрибуты (наиболее стабильные)
2. **Второй приоритет**: Поиск по текстовому содержимому
3. **Третий приоритет**: CSS классы (могут изменяться)

### Обработка ошибок

```javascript
// Универсальная функция поиска элемента с fallback
function findElement(selectors, textContent = null) {
  // Пробуем каждый селектор по очереди
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      if (textContent) {
        const found = Array.from(elements).find(el => 
          el.textContent.trim().includes(textContent)
        );
        if (found) return found;
      } else {
        return elements[0];
      }
    }
  }
  
  // Если ничего не найдено, возвращаем null
  return null;
}

// Пример использования
const showButton = findElement(
  ['[data-test-id="show-tickets"]', 'button'], 
  'Показать билеты'
);
```

### Ожидание загрузки элементов

```javascript
// Ожидание появления элемента
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        return;
      }
      
      setTimeout(checkElement, 100);
    };
    
    checkElement();
  });
}

// Пример использования
try {
  const ticketsContainer = await waitForElement('[data-test-id="tickets-container"]', 3000);
  // Работаем с билетами
} catch (error) {
  console.log('Билеты не загрузились:', error.message);
}
```

## Изменения в коде расширения

### Обновленные функции

Рекомендуемые изменения в коде расширения:

```javascript
// modules/search.js - обновленная функция очистки
async function clearSelection() {
  // Обновленный селектор
  const clearButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.trim() === 'Сбросить'  // Изменено с 'Очистить'
  );
  
  if (clearButton) {
    clearButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
  return false;
}

// modules/main.js - обновленная функция поиска кнопки "Показать билеты"
async function selectNumbers() {
  // ... код выбора чисел ...
  
  const showTicketsButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.trim() === 'Показать билеты'
  );
  
  if (showTicketsButton) {
    console.log('Нажимаем кнопку "Показать билеты"');
    showTicketsButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }
  
  return false;
}
```

## Тестирование селекторов

### Скрипт для проверки

```javascript
// Скрипт для тестирования всех селекторов
function testSelectors() {
  const results = {
    numbers: document.querySelectorAll('[data-test-id="number"]').length,
    selectedNumbers: document.querySelectorAll('[data-test-id="selected-number"]').length,
    showTicketsButton: !!Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.trim() === 'Показать билеты'
    ),
    resetButton: !!Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.trim() === 'Сбросить'
    ),
    authLink: document.querySelectorAll('a[href*="/auth"]').length,
    walletLink: document.querySelectorAll('a[href="/private/wallet?int=header"]').length,
    isLoggedIn: isUserLoggedIn()
  };
  
  console.table(results);
  return results;
}

// Запуск теста
testSelectors();
```