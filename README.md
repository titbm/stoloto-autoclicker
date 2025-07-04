# Столото Автокликер

Расширение Chrome для автоматического поиска билетов с заданными числами на сайте Столото.

[![Version](https://img.shields.io/badge/version-1.2.2-blue.svg)](https://github.com/titbm/stoloto-autoclicker/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Возможности

- Поиск билета с заданными числами
- Исключение нежелательных чисел из поиска
- Три режима поиска:
  - Числа где угодно (поиск билетов, где просто есть все указанные числа)
  - Числа в одной половине (все числа должны быть в верхней или нижней половине билета)
  - Числа в одной строке (все числа должны находиться в одной строке билета)
- Режим покупки билетов (автоматический выбор и имитация покупки указанного количества подходящих билетов)
- Автоматическое перелистывание страниц с билетами
- Возможность остановить поиск в любой момент

## Установка

### Из релизов GitHub
1. Скачайте последний релиз расширения со [страницы релизов](https://github.com/titbm/stoloto-autoclicker/releases)
2. Распакуйте архив в удобное место
3. Откройте Chrome и перейдите на страницу `chrome://extensions/`
4. Включите "Режим разработчика" (переключатель в правом верхнем углу)
5. Нажмите "Загрузить распакованное расширение"
6. Выберите папку с распакованными файлами расширения

### Из исходного кода
1. Склонируйте репозиторий:
```bash
git clone https://github.com/titbm/stoloto-autoclicker.git
```
2. Откройте Chrome и перейдите на страницу `chrome://extensions/`
3. Включите "Режим разработчика"
4. Нажмите "Загрузить распакованное расширение"
5. Выберите папку с клонированным репозиторием

## Использование

1. Перейдите на страницу [Русское лото](https://www.stoloto.ru/ruslotto/game?viewType=favorite)
2. Нажмите на иконку расширения в панели инструментов Chrome
3. Введите нужные числа через запятую в поле "Искать числа" (например: 1,2,3,4,5)
4. При необходимости введите нежелательные числа в поле "Исключить числа"
5. Выберите подходящий режим поиска
6. Нажмите кнопку "Запустить"
7. Для остановки поиска нажмите кнопку "Остановить"

## Режимы поиска

1. **Числа где угодно** - самый простой режим, ищет билеты, где просто присутствуют все указанные числа
2. **Числа в одной половине** - ищет билеты, где все указанные числа находятся либо в верхней половине (строки 1-3), либо в нижней половине (строки 4-6)
3. **Числа в одной строке** - самый строгий режим, ищет билеты, где все указанные числа находятся в одной строке

## Примечание

- Расширение работает только на официальном сайте Столото (https://www.stoloto.ru/)
- Чтобы избежать блокировки, расширение использует случайные задержки между действиями
- В консоли разработчика (F12) можно видеть подробную информацию о процессе поиска

## История версий

### v1.2.2 (13 мая 2025)
- Исправление: Улучшена логика возобновления процесса выбора чисел после перезагрузки страницы в режиме покупки билетов, чтобы гарантировать корректный повторный выбор чисел и нажатие "Показать билеты".

### v1.2.1 (13 мая 2025)
- Исправление: Корректное возобновление выбора чисел после перезагрузки страницы в режиме покупки билетов.

### v1.2.0 (13 мая 2025)
- Добавлен режим покупки билетов:
    - Возможность указать количество билетов для покупки.
    - Автоматический выбор подходящих билетов.
    - Имитация нажатия кнопки "Оплатить кошельком".
    - Автоматическая перезагрузка страницы и продолжение покупки, если не все билеты куплены за один раз.
    - Отображение статуса покупки (количество купленных/требуемых билетов).
    - Обработка ситуации отсутствия кнопки оплаты.
- Улучшена логика возобновления работы расширения после перезагрузки страницы в режиме покупки.

### v1.1.0 (12 мая 2025) 
- Улучшение: умное поведение иконки расширения
  - Открытие окна поиска при клике на рабочей странице
  - Автоматическое открытие рабочей страницы при клике на других вкладках
- Оптимизация: упрощен манифест, удалены лишние скрипты

### v1.0.2 (12 мая 2025)
- Оптимизация: упрощен манифест, удалены лишние скрипты

### v1.0.1 (12 мая 2025)
- Оптимизация: ограничение работы расширения только страницей Русского лото
- Исправление: уточнен URL для работы расширения

### v1.0.0 (12 мая 2025)
- Первый публичный релиз
- Три режима поиска билетов:
  - Поиск по всему билету
  - Поиск в половине билета
  - Поиск в одной строке
- Возможность исключения нежелательных чисел
- Автоматическое перелистывание страниц
- Случайные задержки между действиями

## Планы по развитию

- [ ] Сохранение истории поиска
- [ ] Статистика найденных билетов
- [ ] Экспорт результатов в CSV
- [ ] Настройка временных задержек
- [ ] Поддержка других лотерей Столото

## Разработка

Для участия в разработке:
1. Сделайте форк репозитория
2. Создайте ветку для новой функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте изменения в ваш форк (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## Лицензия

Это программное обеспечение распространяется под лицензией MIT. Подробности в файле [LICENSE](LICENSE).
