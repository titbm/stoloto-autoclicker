F---
inclusion: always
---

# Столото Автокликер - Знания о проекте

Этот файл содержит ключевые знания о проекте для использования при разработке.

## Полная документация проекта
Главная документация: #[[file:docs/README.md]]

## Архитектурная документация
- Обзор расширения: #[[file:docs/architecture/extension-overview.md]]
- Взаимодействие компонентов: #[[file:docs/architecture/component-interaction.md]]
- Chrome APIs: #[[file:docs/architecture/chrome-apis.md]]

## Интеграция со Столото
- DOM структура: #[[file:docs/stoloto-integration/dom-structure.md]]
- Справочник селекторов: #[[file:docs/stoloto-integration/selectors-reference.md]]
- Пользовательские сценарии: #[[file:docs/stoloto-integration/user-flows.md]]

## Алгоритмы и логика
- Режимы поиска: #[[file:docs/algorithms/search-modes.md]]
- Валидация чисел: #[[file:docs/algorithms/number-validation.md]]
- Защита от блокировки: #[[file:docs/algorithms/anti-blocking.md]]

## Управление состоянием
- Схема хранения: #[[file:docs/state-management/storage-schema.md]]
- Жизненный цикл: #[[file:docs/state-management/lifecycle.md]]
- Синхронизация: #[[file:docs/state-management/synchronization.md]]

## Справочники разработчика
- Справочник функций: #[[file:docs/development/functions-reference.md]]
- Паттерны разработки: #[[file:docs/development/patterns.md]]
- Отладка и тестирование: #[[file:docs/development/debugging.md]]

## Архитектура расширения
- **popup.js** - интерфейс расширения, обработка пользовательского ввода
- **content.js** - основная логика работы на странице Столото
- **event_page.js** - фоновый скрипт (service worker)
- **manifest.json** - конфигурация расширения (Manifest V3)

## Ключевые селекторы сайта Столото
- Числа в билете: `[data-test-id="number"]`
- Выбранные числа: `[data-test-id="selected-number"]`
- Кнопка "Показать билеты": `button[data-test-id="show-tickets"]`
- Кнопка "Другие билеты": `button[data-test-id="other-tickets"]`

## Селекторы пользовательского интерфейса
- Баланс пользователя: `a[href="/private/wallet?int=header"]` (содержит текст с суммой, например "0 ₽")
- Бонусы пользователя: `a[href="/private/bonus?int=header"]` (содержит количество бонусов)
- Ссылка на мои билеты: `a[href="/private/tickets/all?int=header"]`

## Режимы поиска
- **anywhere** - числа где угодно в билете
- **half** - числа в одной половине (строки 1-3 или 4-6)
- **row** - числа в одной строке

## Chrome Storage схема
```javascript
// Состояние покупки
purchaseState: {
  isPurchaseMode: boolean,
  totalTicketsToBuy: number,
  ticketsPurchased: number,
  // ... другие поля
}

// Последний поиск
lastSearch: {
  numbers: number[],
  excludeNumbers: number[],
  mode: string
}
```

## Работа с балансом пользователя
Баланс отображается в правом верхнем углу сайта только для авторизованных пользователей.

### Селекторы баланса
- **Ссылка на баланс**: `a[href="/private/wallet?int=header"]`
- **Текст баланса**: содержится внутри ссылки в формате "X ₽" (например, "0 ₽", "1500 ₽")
- **Иконка кошелька**: `img` внутри ссылки на баланс

### Селекторы бонусов
- **Ссылка на бонусы**: `a[href="/private/bonus?int=header"]`
- **Количество бонусов**: текстовое содержимое ссылки (например, "46")
- **Иконка бонусов**: `img` внутри ссылки на бонусы

### Пример получения баланса
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

## Важные функции
- `clickNumbers()` - основная функция поиска
- `analyzeTicket()` - анализ билета на соответствие критериям
- `isUserLoggedIn()` - проверка авторизации
- `getUserBalance()` - получение баланса пользователя из интерфейса