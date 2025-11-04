# Архитектура проекта

Проект построен на принципах **DDD** и **Clean Architecture** с упором на **YAGNI**.

## Структура папок

```
src/
├── domain/              # Данные (Entities, Value Objects)
├── usecases/            # Процессы с данными (Use Cases)
├── adapters/            # API и парсеры (внешний мир)
├── ui/                  # Визуальные компоненты
├── shared/              # Общие утилиты
├── background.js        # Service Worker (корень)
└── content.js           # Content Script (корень)
```

## Слои

### 1. domain/ - Доменный слой
**Что:** Бизнес-объекты и правила
**Зависимости:** НОЛЬ
**Файлы:**
- `Ticket.js` - Entity (билет с ID)
- `SearchCriteria.js` - Value Object (критерии поиска)
- `UserData.js` - Value Object (данные пользователя)

### 2. usecases/ - Слой сценариев
**Что:** Бизнес-процессы приложения
**Зависимости:** только domain/
**Файлы:**
- `SearchTickets.js` - сценарий поиска билетов

### 3. adapters/ - Слой адаптеров
**Что:** Мосты к внешним системам (API, парсеры)
**Зависимости:** domain/, usecases/
**Файлы:**
- `WebsiteAdapter.js` - парсинг DOM сайта Столото
- `ChromeAdapter.js` - работа с Chrome API (storage, messaging)

### 4. ui/ - Слой интерфейса
**Что:** Визуальные компоненты
**Зависимости:** все слои
**Структура:**
- `sidepanel/` - боковая панель расширения (HTML + JS)
- `banners/` - баннеры на странице Столото

### 5. shared/ - Общие модули
**Что:** Переиспользуемый код
**Файлы:**
- `constants.js` - константы (режимы, URL, лимиты)
- `messaging.js` - обработка сообщений между компонентами
- `errors.js` - обработка ошибок

### 6. Корневые файлы
**background.js** - Service Worker, оркестратор
**content.js** - Content Script, работает на странице Столото

## Принципы

1. **DDD** - Domain-Driven Design
   - Бизнес-логика в domain/
   - Entities vs Value Objects

2. **Clean Architecture**
   - Зависимости направлены внутрь (к domain)
   - Внешние слои знают о внутренних, но не наоборот

3. **YAGNI** - You Aren't Gonna Need It
   - Не создаем код "на будущее"
   - Только то, что нужно сейчас

## Поток данных

```
Пользователь
    ↓
ui/sidepanel.js
    ↓
background.js (оркестратор)
    ↓
usecases/SearchTickets.js
    ↓
adapters/WebsiteAdapter.js
    ↓
Сайт Столото
```
