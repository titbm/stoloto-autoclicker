// Сообщаем о загрузке скрипта
console.log('Столото Автокликер: content script загружен');

// Стили для блока состояния
const STATUS_STYLES = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #007bff;
    color: white;
    padding: 10px 20px;
    font-size: 16px;
    z-index: 10000;
    text-align: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`;

// Функция для создания/обновления блока состояния
function updateStatusBlock(numbers, excludeNumbers, mode) {
    let statusEl = document.getElementById('rusloto-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'rusloto-status';
        statusEl.style.cssText = STATUS_STYLES;
        document.body.insertBefore(statusEl, document.body.firstChild);
    }

    let modeText = '';
    switch(mode) {
        case 'anywhere':
            modeText = 'в любом месте билета';
            break;
        case 'half':
            modeText = 'в одной половине билета';
            break;
        case 'row':
            modeText = 'в одной строке билета';
            break;
    }

    const numbersText = numbers.join(', ');
    const excludeText = excludeNumbers.length > 0 
        ? ` за исключением ${excludeNumbers.join(', ')}` 
        : '';    const ticketsText = ticketsChecked > 0 ? `. Проверено билетов: ${ticketsChecked}` : '';
    const timeText = searchStartTime ? `. Время поиска: ${formatSearchTime()}` : '';
    statusEl.textContent = `Ищем числа ${numbersText}${excludeText} ${modeText}${ticketsText}${timeText}`;
}

// Функция для удаления блока состояния
function removeStatusBlock() {
    const statusEl = document.getElementById('rusloto-status');
    if (statusEl) {
        statusEl.remove();
    }
}

// Флаг для отслеживания состояния поиска
let isSearching = false;
let searchMode = 'half'; // Режим поиска по умолчанию
let ticketsChecked = 0; // Счетчик просмотренных билетов
let searchStartTime = null; // Время начала поиска

// Функция для форматирования времени
function formatSearchTime() {
    if (!searchStartTime) return '';
    const seconds = Math.floor((Date.now() - searchStartTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}м ${remainingSeconds}с`;
}

// Функция очистки выбранных чисел
async function clearSelection() {
    // Находим и нажимаем кнопку "Очистить"
    const clearButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.trim() === 'Очистить'
    );
    
    if (clearButton) {
        clearButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
    }
    return false;
}

// Функция для поиска и клика по кнопкам
async function clickNumbers(numbers, mode, excludeNumbers = []) {
    console.log('Начинаем работу с числами:', numbers, 'исключая:', excludeNumbers, 'режим:', mode);
    isSearching = true;
    searchMode = mode;
    ticketsChecked = 0;
    searchStartTime = Date.now();
    updateStatusBlock(numbers, excludeNumbers, mode);

    // Функция ожидания появления кнопок с числами
    function waitForNumberButtons() {
        return new Promise((resolve) => {
            const checkButtons = () => {
                const allButtons = document.querySelectorAll('button');
                if (allButtons.length > 0) {
                    resolve();
                } else {
                    setTimeout(checkButtons, 500);
                }
            };
            checkButtons();
        });
    }

    // Сначала выбираем числа
    async function selectNumbers() {
        await waitForNumberButtons();
        
        for (const num of numbers) {
            if (!isSearching) return false;

            const buttons = Array.from(document.querySelectorAll('button'));
            const button = buttons.find(btn => {
                const text = btn.textContent.trim();
                return text === num.toString();
            });
            
            if (button) {
                console.log('Нажимаем на число:', num);
                button.click();
                // Ждем случайное время от 250мс до 1000мс
                const delay = Math.floor(Math.random() * (1000 - 250 + 1)) + 250;
                console.log(`Ждем ${delay}мс перед следующим нажатием...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.log('Кнопка не найдена для числа:', num);
            }
        }

        if (!isSearching) return false;

        // Ждем перед нажатием "Показать билеты"
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const showTicketsButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.trim() === 'Показать билеты'
        );
        
        if (showTicketsButton) {
            console.log('Нажимаем кнопку "Показать билеты"');
            showTicketsButton.click();
            // Ждем загрузки билетов
            await new Promise(resolve => setTimeout(resolve, 1000));
            return true;
        } else {
            console.log('Кнопка "Показать билеты" не найдена');
            return false;
        }
    }

    // Функция для анализа билета
    function analyzeTicket(ticket, numbers) {
        const allNumbers = Array.from(ticket.querySelectorAll('[data-test-id="number"], [data-test-id="selected-number"]'));
        
        // Группируем числа по 9 (в каждой строке по 9 чисел)
        const rows = [];
        for (let i = 0; i < allNumbers.length; i += 9) {
            rows.push(allNumbers.slice(i, i + 9));
        }
        
        if (rows.length !== 6) {
            console.log('Неверное количество строк в билете');
            return false;
        }

        console.log('Анализ билета:', ticket.querySelector('[data-test-id="ticket-number"]')?.textContent);

        // Получаем все числа из билета
        const ticketNumbers = rows
            .flat()
            .map(num => parseInt(num.textContent.trim()))
            .filter(num => !isNaN(num));

        // Проверяем, нет ли исключаемых чисел в билете
        if (excludeNumbers.length > 0) {
            const hasExcluded = excludeNumbers.some(num => ticketNumbers.includes(parseInt(num)));
            if (hasExcluded) {
                console.log('❌ В билете найдены исключаемые числа');
                return false;
            }
        }

        switch (searchMode) {
            case 'row': {
                // Проверяем каждую строку
                for (const row of rows) {
                    const rowNumbers = row
                        .map(num => parseInt(num.textContent.trim()))
                        .filter(num => !isNaN(num));
                        
                    const allInRow = numbers.every(num => rowNumbers.includes(parseInt(num)));
                    if (allInRow) {
                        console.log('✅ Все числа найдены в одной строке!');
                        return true;
                    }
                }
                return false;
            }
            case 'half': {
                // Первая половина - первые три строки
                const firstHalf = rows.slice(0, 3)
                    .flat()
                    .map(num => parseInt(num.textContent.trim()))
                    .filter(num => !isNaN(num));

                // Вторая половина - последние три строки
                const secondHalf = rows.slice(3)
                    .flat()
                    .map(num => parseInt(num.textContent.trim()))
                    .filter(num => !isNaN(num));

                console.log('Числа в первой половине:', firstHalf);
                console.log('Числа во второй половине:', secondHalf);

                // Проверяем, все ли указанные числа находятся в первой половине
                const allInFirstHalf = numbers.every(num => firstHalf.includes(parseInt(num)));
                // Проверяем, все ли указанные числа находятся во второй половине
                const allInSecondHalf = numbers.every(num => secondHalf.includes(parseInt(num)));

                if (allInFirstHalf) console.log('✅ Все числа найдены в первой половине!');
                if (allInSecondHalf) console.log('✅ Все числа найдены во второй половине!');

                return allInFirstHalf || allInSecondHalf;
            }
            case 'anywhere': {
                const allFound = numbers.every(num => ticketNumbers.includes(parseInt(num)));
                if (allFound) console.log('✅ Все числа найдены в билете!');
                return allFound;
            }
            default:
                console.error('Неизвестный режим поиска:', searchMode);
                return false;
        }
    }    // Функция для поиска подходящего билета
    async function findSuitableTicket(numbers) {
        while (isSearching) {
            // Ищем все билеты
            const tickets = document.querySelectorAll('button[class*="Ticket_btn"]');
            console.log(`\nАнализируем ${tickets.length} билетов...`);
              let foundTicketsOnPage = [];
            
            // Сначала проверяем все билеты на странице
            for (const ticket of tickets) {
                if (!isSearching) return false;
                ticketsChecked++;
                updateStatusBlock(numbers, excludeNumbers, mode);
                
                if (analyzeTicket(ticket, numbers)) {
                    const ticketNumber = ticket.querySelector('[data-test-id="ticket-number"]')?.textContent || 'неизвестен';
                    console.log('🎯 Найден подходящий билет:', ticketNumber);
                    foundTicketsOnPage.push(ticket);
                }
            }

            // Если нашли подходящие билеты, нажимаем на них
            if (foundTicketsOnPage.length > 0) {
                console.log(`Найдено ${foundTicketsOnPage.length} подходящих билетов на странице`);
                
                // Нажимаем на каждый найденный билет
                for (const ticket of foundTicketsOnPage) {
                    if (!isSearching) return false;
                    
                    const ticketNumber = ticket.querySelector('[data-test-id="ticket-number"]')?.textContent || 'неизвестен';
                    console.log('Выбираем билет:', ticketNumber);
                    ticket.click();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Обновляем статус после выбора всех билетов
                let statusEl = document.getElementById('rusloto-status');
                if (statusEl) {
                    const timeSpent = formatSearchTime();
                    statusEl.textContent = foundTicketsOnPage.length === 1
                        ? `Поиск завершён! Найден подходящий билет. Проверено билетов: ${ticketsChecked}, время: ${timeSpent}`
                        : `Поиск завершён! Найдено билетов: ${foundTicketsOnPage.length}. Проверено: ${ticketsChecked}, время: ${timeSpent}`;
                    statusEl.style.background = '#28a745';
                }

                console.log('✅ Поиск успешно завершен');
                return true;
            }
            
            if (!isSearching) return false;
            
            console.log('❌ Подходящий билет не найден на этой странице');
            
            const otherTicketsButton = Array.from(document.querySelectorAll('button')).find(
                btn => btn.textContent.trim() === 'Другие билеты'
            );
            
            if (otherTicketsButton) {
                console.log('Пробуем другие билеты...');
                otherTicketsButton.click();
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
                console.log('Кнопка "Другие билеты" не найдена');
                break;
            }
        }
        removeStatusBlock();
        return false;
    }

    // Запускаем процесс
    const numbersSelected = await selectNumbers();
    if (numbersSelected && isSearching) {
        await findSuitableTicket(numbers);
    }
}

// Слушаем сообщения от popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Получено сообщение:', request);
    if (request.action === 'clickNumbers') {
        // Сначала очищаем предыдущий выбор
        clearSelection().then(() => {
            clickNumbers(request.numbers, request.mode, request.excludeNumbers || []);
            sendResponse({status: 'success'});
        });
        return true;    } else if (request.action === 'stopSearch') {
        console.log('Останавливаем поиск и обновляем страницу...');
        isSearching = false;
        searchStartTime = null;
        removeStatusBlock();
        // Сначала очищаем выбранные числа
        clearSelection().then(() => {
            sendResponse({status: 'stopped'});
            setTimeout(() => window.location.reload(), 100);
        });
        return true;
    }
});
