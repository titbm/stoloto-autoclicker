// Флаг для отслеживания состояния поиска
let isSearching = false;
let searchMode = 'half'; // Режим поиска по умолчанию

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
    }

    // Функция для поиска подходящего билета
    async function findSuitableTicket(numbers) {
        while (isSearching) {
            // Ищем все билеты
            const tickets = document.querySelectorAll('button[class*="Ticket_btn"]');
            console.log(`\nАнализируем ${tickets.length} билетов...`);
            
            // Проверяем каждый билет
            for (const ticket of tickets) {
                if (!isSearching) return false;
                
                if (analyzeTicket(ticket, numbers)) {
                    console.log('🎯 Найден подходящий билет!');
                    console.log('Нажимаем на кнопку выбора билета');
                    ticket.click();
                    return true;
                }
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
        return true;
    } else if (request.action === 'stopSearch') {
        console.log('Останавливаем поиск и обновляем страницу...');
        isSearching = false;
        // Сначала очищаем выбранные числа
        clearSelection().then(() => {
            sendResponse({status: 'stopped'});
            setTimeout(() => window.location.reload(), 100);
        });
        return true;
    }
});
