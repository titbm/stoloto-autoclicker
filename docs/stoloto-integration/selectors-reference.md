# Справочник CSS селекторов сайта Столото

## Обзор

Данный документ содержит полный справочник CSS селекторов для взаимодействия с сайтом Столото, основанный на анализе реального сайта и сравнении с кодом расширения.

## Селекторы чисел билетов

### Кнопки выбора чисел (1-90)

| Элемент | Рабочий селектор | Описание | Статус |
|---------|------------------|----------|---------|
| Кнопки чисел | `button[data-test-id="number"]` | Все кнопки чисел от 1 до 90 | ✅ Работает |
| Поиск по тексту | `button` с `textContent === "N"` | Поиск кнопки по номеру числа | ✅ Работает |
| CSS классы | `.ButtonNum_buttonNum__IOnWn` | Специфический класс для кнопок чисел | ✅ Работает |

**Пример использования:**
```javascript
// Метод 1: По data-test-id (рекомендуется)
const numberButtons = document.querySelectorAll('[data-test-id="number"]');

// Метод 2: Поиск конкретного числа по тексту
const number7 = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === '7'
);

// Метод 3: По CSS классу
const allNumberButtons = document.querySelectorAll('.ButtonNum_buttonNum__IOnWn');
```

### Выбранные числа

| Элемент | Рабочий селектор | Описание | Статус |
|---------|------------------|----------|---------|
| Выбранные кнопки | `button[active]` | Кнопки с атрибутом active | ✅ Работает |
| Data-test-id | `[data-test-id="selected-number"]` | Элементы выбранных чисел | ⚠️ Не кнопки |

**Важно**: `[data-test-id="selected-number"]` НЕ относится к кнопкам чисел! Это отдельные элементы интерфейса.

**Пример использования:**
```javascript
// Получить все выбранные кнопки чисел
const selectedButtons = document.querySelectorAll('button[active]');

// Проверить, выбрано ли конкретное число
const isNumber7Selected = document.querySelector('button[active]')?.textContent.trim() === '7';
```

## Кнопки управления

### Кнопка "Показать билеты"

| Свойство | Значение | Статус |
|----------|----------|---------|
| Текст | "Показать билеты" | ✅ |
| Data-test-id | `other_ticket` | ❌ Неправильное название |
| CSS классы | `Button_fluid__2K933 Button_largeSize__ciSMQ ButtonAdd_addBtn__JTQJu` | ✅ |
| Селектор в коде | `[data-test-id="show-tickets"]` | ❌ Не существует |

**Рекомендуемый селектор:**
```javascript
// Поиск по тексту (наиболее надежный)
const showTicketsBtn = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Показать билеты'
);

// Альтернативный селектор по data-test-id
const showTicketsBtn2 = document.querySelector('[data-test-id="other_ticket"]');
```

### Кнопка "Другие билеты"

| Свойство | Значение | Статус |
|----------|----------|---------|
| Текст | "Другие билеты" | ✅ |
| Data-test-id | `other_ticket` | ✅ |
| CSS классы | `Button_fluid__2K933 Button_largeSize__ciSMQ ButtonAdd_addBtn__JTQJu` | ✅ |
| Селектор в коде | `[data-test-id="other-tickets"]` | ❌ Не существует |

**Рекомендуемый селектор:**
```javascript
// Поиск по тексту
const otherTicketsBtn = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Другие билеты'
);

// По data-test-id
const otherTicketsBtn2 = document.querySelector('[data-test-id="other_ticket"]');
```

### Кнопка "Сбросить"

| Свойство | Значение | Статус |
|----------|----------|---------|
| Текст | "Сбросить" | ✅ |
| Data-test-id | `clear_btn` | ✅ |
| CSS классы | `ButtonClear_btnClear__Qywjy` | ✅ |
| Селектор в коде | Поиск по тексту "Очистить" | ❌ Неправильный текст |

**Рекомендуемый селектор:**
```javascript
// По data-test-id (рекомендуется)
const clearBtn = document.querySelector('[data-test-id="clear_btn"]');

// Поиск по тексту
const clearBtn2 = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Сбросить'
);
```

## Селекторы билетов

### Контейнеры билетов

| Элемент | Рабочий селектор | Описание | Статус |
|---------|------------------|----------|---------|
| Билеты | `button.Ticket_btn__L4SXA` | Кнопки билетов | ✅ Работает |
| Альтернативный | `button[class*="Ticket"]` | Поиск по части класса | ✅ Работает |
| Номера билетов | `[data-test-id="ticket-number"]` | Номера билетов | ✅ Работает |

**Пример использования:**
```javascript
// Получить все билеты
const tickets = document.querySelectorAll('button.Ticket_btn__L4SXA');

// Получить номера билетов
const ticketNumbers = document.querySelectorAll('[data-test-id="ticket-number"]');
```

### Числа в билетах

**Важно**: Числа в билетах НЕ имеют `data-test-id="number"` или `data-test-id="selected-number"`!

| Элемент | Рабочий селектор | Описание | Статус |
|---------|------------------|----------|---------|
| Числа в билете | `generic` внутри билета | Элементы с числами | ✅ Работает |
| Селектор в коде | `[data-test-id="number"]` | Используется в коде | ❌ Неправильно |

**Правильный способ получения чисел из билета:**
```javascript
function getTicketNumbers(ticketElement) {
  // Получаем все generic элементы внутри билета
  const numberElements = ticketElement.querySelectorAll('generic');
  
  // Фильтруем только те, что содержат числа
  const numbers = Array.from(numberElements)
    .map(el => parseInt(el.textContent.trim()))
    .filter(num => !isNaN(num) && num >= 1 && num <= 90);
    
  return numbers;
}
```

## Селекторы аутентификации

### Неавторизованный пользователь

| Элемент | Рабочий селектор | Описание | Статус |
|---------|------------------|----------|---------|
| Ссылка входа | `a[href*="auth"]` | Ссылка "Вход и регистрация" | ✅ Работает |
| Текст ссылки | "Вход и регистрация" | Текстовое содержимое | ✅ Работает |
| CSS классы | `Button_primary__8vTWw Button_defaultSize__1RE37` | Стили кнопки | ✅ Работает |

### Авторизованный пользователь

| Элемент | Рабочий селектор | Описание | Статус |
|---------|------------------|----------|---------|
| Ссылка кошелька | `a[href*="private/wallet"]` | Баланс пользователя | ⚠️ Только для авторизованных |
| Ссылка бонусов | `a[href*="private/bonus"]` | Бонусы пользователя | ⚠️ Только для авторизованных |
| Мои билеты | `a[href*="private/tickets"]` | Личные билеты | ⚠️ Только для авторизованных |

**Пример проверки авторизации:**
```javascript
function isUserLoggedIn() {
  // Если есть ссылка на вход - пользователь НЕ авторизован
  const authLink = document.querySelector('a[href*="auth"]');
  if (authLink && authLink.textContent.includes('Вход и регистрация')) {
    return false;
  }
  
  // Если есть ссылки на приватные разделы - пользователь авторизован
  const walletLink = document.querySelector('a[href*="private/wallet"]');
  const bonusLink = document.querySelector('a[href*="private/bonus"]');
  
  return !!(walletLink || bonusLink);
}
```

## Селекторы баланса и бонусов

### Баланс пользователя

| Элемент | Рабочий селектор | Описание | Статус |
|---------|------------------|----------|---------|
| Ссылка баланса | `a[href="/private/wallet?int=header"]` | Точная ссылка на кошелек | ✅ Работает |
| Альтернативный | `a[href*="private/wallet"]` | Поиск по части URL | ✅ Работает |
| Селектор в коде | `a[href="/private/wallet?int=header"]` | Используется в коде | ✅ Правильно |

### Бонусы пользователя

| Элемент | Рабочий селектор | Описание | Статус |
|---------|------------------|----------|---------|
| Ссылка бонусов | `a[href="/private/bonus?int=header"]` | Точная ссылка на бонусы | ✅ Работает |
| Альтернативный | `a[href*="private/bonus"]` | Поиск по части URL | ✅ Работает |
| Селектор в коде | `a[href="/private/bonus?int=header"]` | Используется в коде | ✅ Правильно |

**Пример получения баланса:**
```javascript
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
```

## Селекторы кнопок оплаты

### Кнопки покупки и оплаты

| Элемент | Рабочий селектор | Описание | Статус |
|---------|------------------|----------|---------|
| Оплата кошельком | Поиск по тексту "Оплатить кошельком" | Кнопка оплаты | ⚠️ Появляется после выбора |
| Оплата по QR | Поиск по тексту содержащему "QR" | QR-код оплата | ⚠️ Появляется после выбора |

**Пример поиска кнопок оплаты:**
```javascript
function checkPaymentButtons() {
  const allButtons = Array.from(document.querySelectorAll('button'));
  
  const payByWalletButton = allButtons.find(btn => 
    btn.textContent.trim().includes('Оплатить кошельком')
  );
  
  const payByQRButton = allButtons.find(btn => 
    btn.textContent.trim().includes('QR') || 
    btn.textContent.trim().includes('Оплатить по QR')
  );
  
  return {
    walletPaymentAvailable: !!payByWalletButton,
    qrPaymentAvailable: !!payByQRButton
  };
}
```

## Несоответствия с кодом расширения

### Критические ошибки в селекторах

| Селектор в коде | Реальность | Проблема | Решение |
|-----------------|------------|----------|---------|
| `[data-test-id="show-tickets"]` | Не существует | Кнопка не найдена | Использовать поиск по тексту |
| `[data-test-id="other-tickets"]` | Не существует | Кнопка не найдена | Использовать `[data-test-id="other_ticket"]` |
| Поиск "Очистить" | Текст "Сбросить" | Неправильный текст | Использовать "Сбросить" |
| `[data-test-id="number"]` в билетах | Только для кнопок выбора | Неправильное применение | Использовать `generic` элементы |

### Рекомендации по исправлению

1. **Кнопка "Показать билеты"**: Заменить селектор на поиск по тексту
2. **Кнопка "Другие билеты"**: Использовать `[data-test-id="other_ticket"]`
3. **Кнопка очистки**: Искать текст "Сбросить" вместо "Очистить"
4. **Числа в билетах**: Парсить `generic` элементы внутри билетов
5. **Выбранные числа**: Использовать атрибут `active` вместо `data-test-id="selected-number"`

## Заключение

Реальные селекторы сайта Столото значительно отличаются от предположений в коде расширения. Основные проблемы связаны с:

1. Неправильными `data-test-id` значениями
2. Неточными текстами кнопок
3. Неправильным пониманием структуры билетов
4. Путаницей между элементами выбора чисел и числами в билетах

Для корректной работы расширения необходимо обновить все селекторы согласно данному справочнику.