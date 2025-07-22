# Design Document

## Overview

Документация проекта "Столото Автокликер" будет структурирована как комплексный справочник, охватывающий архитектуру расширения Chrome, взаимодействие с сайтом Столото, алгоритмы поиска билетов и управление состоянием. Документация создается для систематизации знаний о проекте и ускорения разработки.

## Architecture

### Document Structure

Документация будет организована в виде нескольких взаимосвязанных разделов:

```
docs/
├── architecture/
│   ├── extension-overview.md      # Общая архитектура расширения
│   ├── component-interaction.md   # Взаимодействие компонентов
│   └── chrome-apis.md            # Используемые Chrome API
├── stoloto-integration/
│   ├── dom-structure.md          # Структура DOM сайта
│   ├── selectors-reference.md    # Справочник селекторов
│   └── user-flows.md            # Пользовательские сценарии
├── algorithms/
│   ├── search-modes.md           # Режимы поиска билетов
│   ├── number-validation.md      # Валидация и фильтрация
│   └── anti-blocking.md         # Стратегии избежания блокировки
├── state-management/
│   ├── storage-schema.md         # Схема данных Chrome Storage
│   ├── lifecycle.md             # Жизненный цикл состояний
│   └── synchronization.md       # Синхронизация между компонентами
└── development/
    ├── functions-reference.md    # Справочник функций
    ├── patterns.md              # Паттерны и best practices
    └── debugging.md             # Отладка и тестирование
```

### Content Organization Principles

1. **Модульность** - каждый раздел покрывает конкретную область знаний
2. **Практичность** - акцент на примеры кода и конкретные решения
3. **Актуальность** - документация синхронизирована с текущим кодом
4. **Навигация** - перекрестные ссылки между разделами

## Components and Interfaces

### Architecture Documentation Components

#### Extension Overview (`architecture/extension-overview.md`)
- **Назначение**: Описание общей архитектуры расширения Chrome
- **Содержание**:
  - Схема взаимодействия popup.js, content.js, event_page.js
  - Роль manifest.json и конфигурация Manifest V3
  - Жизненный цикл расширения от установки до работы
  - Права доступа и ограничения безопасности

#### Component Interaction (`architecture/component-interaction.md`)
- **Назначение**: Детальное описание коммуникации между компонентами
- **Содержание**:
  - Схема передачи сообщений через chrome.runtime.sendMessage
  - Обработка событий в popup и content script
  - Синхронизация состояния через Chrome Storage API
  - Обработка ошибок и восстановление соединения

#### Chrome APIs Reference (`architecture/chrome-apis.md`)
- **Назначение**: Справочник используемых Chrome API
- **Содержание**:
  - chrome.storage.local - схема данных и примеры использования
  - chrome.tabs - управление вкладками и отправка сообщений
  - chrome.scripting - инъекция скриптов и выполнение кода
  - chrome.action - управление иконкой и popup

### Stoloto Integration Components

#### DOM Structure (`stoloto-integration/dom-structure.md`)
- **Назначение**: Описание структуры HTML сайта Столото
- **Содержание**:
  - Структура билета и расположение чисел по строкам
  - Элементы навигации и пагинации
  - Формы выбора чисел и кнопки управления
  - Индикаторы загрузки и состояния страницы

#### Selectors Reference (`stoloto-integration/selectors-reference.md`)
- **Назначение**: Справочник CSS селекторов для взаимодействия с сайтом
- **Содержание**:
  - Селекторы чисел в билетах: `[data-test-id="number"]`, `[data-test-id="selected-number"]`
  - Кнопки управления: "Показать билеты", "Другие билеты", "Очистить"
  - Элементы авторизации и определения статуса пользователя
  - Кнопки оплаты и покупки билетов

#### User Flows (`stoloto-integration/user-flows.md`)
- **Назначение**: Описание пользовательских сценариев на сайте
- **Содержание**:
  - Процесс выбора чисел и генерации билетов
  - Навигация между страницами билетов
  - Процедура покупки и оплаты билетов
  - Определение статуса авторизации пользователя

### Algorithm Components

#### Search Modes (`algorithms/search-modes.md`)
- **Назначение**: Детальное описание алгоритмов поиска
- **Содержание**:
  - Режим "anywhere": поиск чисел в любом месте билета
  - Режим "half": поиск в верхней (строки 1-3) или нижней (строки 4-6) половине
  - Режим "row": поиск всех чисел в одной строке билета
  - Функция `analyzeTicket()` и логика валидации

#### Number Validation (`algorithms/number-validation.md`)
- **Назначение**: Алгоритмы валидации и фильтрации чисел
- **Содержание**:
  - Парсинг чисел из пользовательского ввода
  - Валидация диапазона (1-90) и формата
  - Логика исключения нежелательных чисел
  - Обработка дублирующихся чисел между полями поиска и исключений

#### Anti-blocking (`algorithms/anti-blocking.md`)
- **Назначение**: Стратегии избежания блокировки сайтом
- **Содержание**:
  - Случайные задержки между действиями (250-1000мс)
  - Имитация человеческого поведения при кликах
  - Обработка ошибок сети и таймаутов
  - Восстановление после перезагрузки страницы

### State Management Components

#### Storage Schema (`state-management/storage-schema.md`)
- **Назначение**: Схема данных в Chrome Storage
- **Содержание**:
  - Структура объекта `purchaseState` для режима покупки
  - Объект `lastSearch` для сохранения параметров поиска
  - Кэш `authStatus` для статуса авторизации пользователя
  - Временные метки и валидация данных

#### Lifecycle (`state-management/lifecycle.md`)
- **Назначение**: Жизненный цикл состояний приложения
- **Содержание**:
  - Состояния поиска: not_started, searching, found, completed
  - Состояния покупки: idle, purchasing, payment, completed
  - Переходы между состояниями и условия активации
  - Восстановление состояния после перезагрузки

#### Synchronization (`state-management/synchronization.md`)
- **Назначение**: Синхронизация данных между компонентами
- **Содержание**:
  - Обмен сообщениями между popup.js и content.js
  - Обновление UI в реальном времени
  - Сохранение промежуточных результатов поиска
  - Обработка конфликтов и восстановление синхронизации

### Development Components

#### Functions Reference (`development/functions-reference.md`)
- **Назначение**: Справочник ключевых функций проекта
- **Содержание**:
  - `clickNumbers()` - основная функция поиска билетов
  - `analyzeTicket()` - анализ соответствия билета критериям
  - `isUserLoggedIn()` - определение статуса авторизации
  - `savePurchaseState()` / `loadPurchaseState()` - управление состоянием покупки

#### Patterns (`development/patterns.md`)
- **Назначение**: Паттерны разработки и best practices
- **Содержание**:
  - Асинхронные паттерны с async/await
  - Обработка ошибок и graceful degradation
  - Паттерны работы с DOM и селекторами
  - Организация кода и разделение ответственности

#### Debugging (`development/debugging.md`)
- **Назначение**: Руководство по отладке и тестированию
- **Содержание**:
  - Использование console.log для трассировки выполнения
  - Отладка через Chrome DevTools
  - Тестирование различных сценариев на сайте
  - Диагностика проблем с авторизацией и состоянием

## Data Models

### Documentation File Structure

```typescript
interface DocumentationFile {
  path: string;           // Путь к файлу документации
  title: string;          // Заголовок документа
  description: string;    // Краткое описание содержания
  lastUpdated: Date;      // Дата последнего обновления
  codeReferences: string[]; // Ссылки на соответствующие файлы кода
  relatedDocs: string[];  // Связанные документы
}

interface CodeExample {
  language: string;       // Язык программирования
  code: string;          // Код примера
  description: string;   // Описание примера
  filename?: string;     // Исходный файл (если применимо)
  lineNumbers?: number[]; // Номера строк в исходном файле
}

interface APIReference {
  name: string;          // Название API или функции
  signature: string;     // Сигнатура функции
  parameters: Parameter[]; // Параметры
  returnType: string;    // Тип возвращаемого значения
  description: string;   // Описание назначения
  examples: CodeExample[]; // Примеры использования
}
```

### Storage Data Models

```typescript
interface PurchaseState {
  isPurchaseMode: boolean;
  totalTicketsToBuy: number;
  ticketsPurchased: number;
  purchaseSearchNumbers: number[];
  purchaseExcludeNumbers: number[];
  purchaseSearchMode: 'anywhere' | 'half' | 'row';
  purchaseTicketsChecked: number;
  purchaseStartTime: number;
  timestamp: number;
}

interface LastSearch {
  numbers: number[];
  excludeNumbers: number[];
  mode: 'anywhere' | 'half' | 'row';
  isPurchaseMode: boolean;
  ticketsToBuy: number;
  timestamp: number;
}

interface AuthStatus {
  isLoggedIn: boolean;
  timestamp: number;
}
```

## Error Handling

### Documentation Error Scenarios

1. **Устаревшая информация**
   - Автоматическая проверка актуальности селекторов
   - Уведомления о изменениях в коде проекта
   - Версионирование документации

2. **Неполная документация**
   - Чек-лист обязательных разделов для каждого компонента
   - Автоматическая генерация заглушек для новых функций
   - Валидация ссылок между документами

3. **Несоответствие коду**
   - Сравнение примеров кода с актуальными файлами
   - Автоматическое обновление сигнатур функций
   - Тестирование примеров кода на работоспособность

### Content Validation

- **Технические примеры**: все примеры кода должны быть протестированы
- **Селекторы DOM**: регулярная проверка актуальности селекторов на сайте
- **API ссылки**: валидация ссылок на Chrome API документацию
- **Перекрестные ссылки**: проверка корректности внутренних ссылок

## Testing Strategy

### Documentation Testing Approach

1. **Структурное тестирование**
   - Проверка наличия всех обязательных разделов
   - Валидация формата Markdown и структуры заголовков
   - Тестирование навигационных ссылок

2. **Содержательное тестирование**
   - Проверка актуальности примеров кода
   - Валидация селекторов DOM на реальном сайте
   - Тестирование описанных алгоритмов

3. **Пользовательское тестирование**
   - Проверка понятности объяснений
   - Тестирование полноты информации для решения задач
   - Валидация последовательности изложения

### Maintenance Strategy

- **Автоматическое обновление**: скрипты для синхронизации с изменениями в коде
- **Регулярный аудит**: ежемесячная проверка актуальности документации
- **Обратная связь**: система для сбора замечаний по документации
- **Версионирование**: отслеживание изменений и история обновлений

### Integration with Development Workflow

- **Pre-commit hooks**: проверка соответствия документации изменениям в коде
- **CI/CD integration**: автоматическая валидация документации при сборке
- **Code review process**: обязательное обновление документации при изменении API
- **Release notes**: автоматическая генерация changelog для документации