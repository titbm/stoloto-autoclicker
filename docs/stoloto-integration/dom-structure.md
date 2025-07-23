# Структура DOM сайта Столото

## Обзор

Данный документ описывает актуальную структуру DOM элементов на сайте Столото для страницы выбора любимых чисел в лотерее "Русское лото". Информация основана на анализе страницы `https://www.stoloto.ru/ruslotto/game?viewType=favorite`.

## Основная структура страницы

### Заголовок и навигация

```html
<navigation>
  <generic>
    <text>Меню</text>
    <img />
  </generic>
  <generic>
    <link>Проверка билетов</link>
    <button>Поддержка</button>
  </generic>
</navigation>
<link>Вход и регистрация</link>
```

**Селекторы авторизации:**
- Ссылка на авторизацию: `link[href*="/auth"]`
- Текст ссылки: "Вход и регистрация"

### Информация о тираже

```html
<generic>
  <heading level=1>Русское лото</heading>
  <generic>
    <!-- Текущий тираж -->
    <generic>
      <paragraph>Тираж № 1662</paragraph>
      <paragraph>
        <generic>23.07 ср</generic>
        <generic>•сайт</generic>
      </paragraph>
      <generic>
        <paragraph>
          <generic>Джекпот</generic>
          <text>800 000 000 ₽</text>
        </paragraph>
        <paragraph>
          <generic>Золотой бочонок</generic>
          <text>9 000 000 ₽</text>
        </paragraph>
      </generic>
    </generic>
    <!-- Будущие тиражи -->
    <generic>...</generic>
  </generic>
</generic>
```

### Навигация по разделам лотереи

```html
<generic>
  <link href="/ruslotto/game?viewType=tickets">Билеты</link>
  <link href="/ruslotto/archive">Архив тиражей</link>
  <link href="/ruslotto/game?viewType=all">Все числа</link>
  <link href="/ruslotto">О лотерее</link>
  <link href="/ruslotto/rules">Правила игры</link>
</generic>
```

## Интерфейс выбора чисел

### Заголовок и инструкции

```html
<generic>
  <img />
  <generic>
    <text>Выберите до 7 любимых чисел — подберём с ними билеты</text>
    <img />
  </generic>
  <button>Сбросить</button>
</generic>
```

**Селекторы управления:**
- Кнопка сброса: `button` с текстом "Сбросить"

### Сетка чисел (1-90)

```html
<generic>
  <button>1</button>
  <button>2</button>
  <!-- ... -->
  <button>90</button>
</generic>
```

**Характеристики кнопок чисел:**
- Всего кнопок: 90 (числа от 1 до 90)
- Активная кнопка имеет атрибут `[active]`
- Каждая кнопка содержит `<generic>` с текстом числа
- Селектор: `button` с текстовым содержимым числа

### Отображение выбранных чисел

После выбора чисел появляется блок:

```html
<generic>
  <img />
  <generic>Выбранные числа</generic>
  <paragraph>1, 5</paragraph>
  <button>
    <img />
  </button>
</generic>
```

### Кнопка показа билетов

```html
<button>Показать билеты</button>
```

**Селектор:** `button` с текстом "Показать билеты"

## Структура билетов

### Контейнер билетов

После нажатия "Показать билеты" появляется список билетов:

```html
<generic>
  <button>Билет №999294061545 [числа билета]</button>
  <button>Билет №999294088430 [числа билета]</button>
  <!-- ... другие билеты ... -->
  <button>Другие билеты</button>
</generic>
```

### Структура отдельного билета

```html
<button>
  <generic>
    <generic>Билет №999294061545</generic>
    <img />
  </generic>
  <!-- Первые 3 строки (строки 1-3) -->
  <generic>
    <generic>19</generic>
    <generic>22</generic>
    <generic>48</generic>
    <generic>50</generic>
    <generic>83</generic>
    <generic>4</generic>
    <generic>35</generic>
    <generic>53</generic>
    <generic>69</generic>
    <generic>70</generic>
    <generic>5</generic>
    <generic>14</generic>
    <generic>27</generic>
    <generic>79</generic>
    <generic>89</generic>
  </generic>
  <!-- Последние 3 строки (строки 4-6) -->
  <generic>
    <generic>2</generic>
    <generic>31</generic>
    <generic>40</generic>
    <generic>67</generic>
    <generic>72</generic>
    <generic>1</generic>
    <generic>21</generic>
    <generic>47</generic>
    <generic>52</generic>
    <generic>68</generic>
    <generic>11</generic>
    <generic>34</generic>
    <generic>57</generic>
    <generic>73</generic>
    <generic>86</generic>
  </generic>
</button>
```

**Ключевые характеристики билета:**
- Каждый билет содержит 30 чисел (6 строк × 5 чисел в каждой строке)
- Числа группируются в два блока по 15 чисел
- Первый блок: строки 1-3 (числа 1-15)
- Второй блок: строки 4-6 (числа 16-30)
- Каждое число находится в отдельном `<generic>` элементе

**Селекторы билетов:**
- Кнопка билета: `button` содержащий текст "Билет №"
- Номер билета: первый `<generic>` внутри кнопки билета
- Числа билета: все `<generic>` элементы с числовым содержимым

### Кнопка навигации

```html
<button>Другие билеты</button>
```

**Селектор:** `button` с текстом "Другие билеты"

## Элементы авторизации и баланса

### Неавторизованное состояние

```html
<link href="/auth?targetUrl=%2Fruslotto%2Fgame%3FviewType%3Dfavorite">
  Вход и регистрация
</link>
```

### Авторизованное состояние

В авторизованном состоянии ссылка "Вход и регистрация" заменяется на элементы профиля:

```html
<link href="/private/wallet?int=header">0 ₽</link>
<link href="/private/bonus?int=header">46</link>
<link href="/private/tickets/all?int=header">Мои билеты</link>
```

**Селекторы авторизованного пользователя:**
- Баланс: `a[href="/private/wallet?int=header"]`
- Бонусы: `a[href="/private/bonus?int=header"]`
- Мои билеты: `a[href="/private/tickets/all?int=header"]`

## Различия с кодом расширения

### Устаревшие селекторы

Код расширения использует следующие селекторы, которые могут быть неактуальными:

1. **Числа в билете:**
   - Код: `[data-test-id="number"], [data-test-id="selected-number"]`
   - Реальность: `<generic>` элементы с числовым содержимым

2. **Номер билета:**
   - Код: `[data-test-id="ticket-number"]`
   - Реальность: первый `<generic>` элемент внутри кнопки билета

3. **Кнопки билетов:**
   - Код: `button[class*="Ticket_btn"]`
   - Реальность: `button` элементы, содержащие текст "Билет №"

### Актуальные селекторы

Рекомендуемые селекторы для обновления кода:

```javascript
// Кнопки чисел (1-90)
const numberButtons = document.querySelectorAll('button');
const numberButton = Array.from(numberButtons).find(btn => 
  btn.textContent.trim() === targetNumber.toString()
);

// Кнопка "Показать билеты"
const showTicketsButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Показать билеты'
);

// Билеты
const tickets = Array.from(document.querySelectorAll('button')).filter(btn => 
  btn.textContent.includes('Билет №')
);

// Числа в билете
const ticketNumbers = Array.from(ticket.querySelectorAll('generic')).filter(el => {
  const text = el.textContent.trim();
  return /^\d+$/.test(text);
});

// Кнопка "Другие билеты"
const otherTicketsButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Другие билеты'
);

// Кнопка "Сбросить"
const clearButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.trim() === 'Сбросить'
);
```

## Примечания

1. **Структура билета:** Билеты содержат 30 чисел, организованных в 6 строк по 5 чисел в каждой
2. **Группировка:** Числа визуально разделены на два блока (строки 1-3 и 4-6)
3. **Селекторы:** Большинство элементов не имеют специальных data-атрибутов, поэтому селекция основана на текстовом содержимом
4. **Динамическое содержимое:** Билеты загружаются динамически после выбора чисел
5. **Авторизация:** Элементы баланса и профиля появляются только для авторизованных пользователей