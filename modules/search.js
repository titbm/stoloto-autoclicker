/**
 * Search Module - Логика поиска и анализа билетов
 * Отвечает за анализ билетов и очистку выбора
 */

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

// Функция для анализа билета
function analyzeTicket(ticket, numbers) {
    const state = window.stolotoState;
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
    const excludeNumbers = state.isPurchaseMode ? state.purchaseExcludeNumbers : [];
    if (excludeNumbers.length > 0) {
        const hasExcluded = excludeNumbers.some(num => ticketNumbers.includes(parseInt(num)));
        if (hasExcluded) {
            console.log('❌ В билете найдены исключаемые числа');
            return false;
        }
    }

    const searchMode = state.isPurchaseMode ? state.purchaseSearchMode : state.searchMode;
    
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
    const state = window.stolotoState;
    
    while (state.isSearching) {
        // Ищем все билеты
        const tickets = document.querySelectorAll('button[class*="Ticket_btn"]');
        console.log(`\nАнализируем ${tickets.length} билетов...`);
        let foundTicketsOnPage = [];
        
        // Сначала проверяем все билеты на странице
        for (const ticket of tickets) {
            if (!state.isSearching) return false;
            state.ticketsChecked++;
            
            // В режиме покупки обновляем счетчик просмотренных билетов
            if (state.isPurchaseMode) {
                state.purchaseTicketsChecked = state.ticketsChecked;
                state.purchaseStartTime = state.searchStartTime;
            }
            
            const excludeNumbers = state.isPurchaseMode ? state.purchaseExcludeNumbers : [];
            const mode = state.isPurchaseMode ? state.purchaseSearchMode : state.searchMode;
            window.stolotoUI.updateStatusBlock(numbers, excludeNumbers, mode);
            
            if (analyzeTicket(ticket, numbers)) {
                const ticketNumber = ticket.querySelector('[data-test-id="ticket-number"]')?.textContent || 'неизвестен';
                console.log('🎯 Найден подходящий билет:', ticketNumber);
                foundTicketsOnPage.push(ticket);
                
                // Если в режиме покупки и уже достигли лимита, прекращаем поиск
                if (state.isPurchaseMode && foundTicketsOnPage.length + state.ticketsPurchased >= state.totalTicketsToBuy) {
                    break;
                }
            }
        }

        // Если нашли подходящие билеты, нажимаем на них
        if (foundTicketsOnPage.length > 0) {
            console.log(`Найдено ${foundTicketsOnPage.length} подходящих билетов на странице`);
            
            // Если в режиме покупки, берем только нужное количество билетов
            if (state.isPurchaseMode) {
                const ticketsToTake = Math.min(foundTicketsOnPage.length, state.totalTicketsToBuy - state.ticketsPurchased);
                foundTicketsOnPage = foundTicketsOnPage.slice(0, ticketsToTake);
                console.log(`В режиме покупки выбираем ${ticketsToTake} билетов`);
            }
            
            // Нажимаем на каждый найденный билет
            for (const ticket of foundTicketsOnPage) {
                if (!state.isSearching) return false;
                
                const ticketNumber = ticket.querySelector('[data-test-id="ticket-number"]')?.textContent || 'неизвестен';
                console.log('Выбираем билет:', ticketNumber);
                ticket.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // В режиме покупки проверяем наличие кнопок оплаты
            if (state.isPurchaseMode) {
                const paymentStatus = window.stolotoPayment.checkPaymentButtons();
                
                if (paymentStatus.walletPaymentAvailable || paymentStatus.qrPaymentAvailable) {
                    console.log('✅ Обнаружены кнопки оплаты:', paymentStatus);
                    
                    // Нажимаем на кнопку "Оплатить кошельком"
                    if (paymentStatus.walletPaymentAvailable) {
                        const allButtons = Array.from(document.querySelectorAll('button'));
                        const payByWalletButton = allButtons.find(btn => 
                            btn.textContent.trim().includes('Оплатить кошельком')
                        );
                        
                        if (payByWalletButton) {
                            console.log('✅ Нажимаем кнопку "Оплатить кошельком"');
                            payByWalletButton.click();
                            
                            // Ждем 5 секунд для обработки оплаты
                            await new Promise(resolve => setTimeout(resolve, 5000));
                            console.log('✅ Оплата обработана');
                        }
                    }
                    
                    // Увеличиваем счетчик купленных билетов
                    state.ticketsPurchased += foundTicketsOnPage.length;
                    
                    // Обновляем информацию о просмотренных билетах и времени поиска
                    state.purchaseTicketsChecked = state.ticketsChecked;
                    state.purchaseStartTime = state.searchStartTime;
                    
                    // Обновляем статус
                    const excludeNumbers = state.purchaseExcludeNumbers;
                    const mode = state.purchaseSearchMode;
                    window.stolotoUI.updateStatusBlock(numbers, excludeNumbers, mode);
                    
                    // Сохраняем состояние покупки
                    await state.savePurchaseState();
                    
                    // Проверяем, достигли ли мы лимита покупок
                    if (state.ticketsPurchased >= state.totalTicketsToBuy) {
                        console.log('✅ Достигнут лимит покупок:', state.ticketsPurchased);
                        
                        // Обновляем текст блока состояния
                        const statusEl = document.getElementById('rusloto-status');
                        if (statusEl) {
                            const timeSpent = window.stolotoUtils.formatSearchTime();
                            statusEl.textContent = `Покупка завершена!\nКуплено билетов: ${state.ticketsPurchased} из ${state.totalTicketsToBuy}\nПроверено: ${state.ticketsChecked}, время: ${timeSpent}`;
                            statusEl.style.background = '#28a745'; // зеленый только при завершении
                        }
                        
                        // Сбрасываем состояние покупки, т.к. мы завершили задачу
                        await state.resetPurchaseState();
                        
                        // Завершаем поиск
                        return true;
                    } else {
                        console.log('⏳ Нужно купить еще билетов:', state.totalTicketsToBuy - state.ticketsPurchased);
                        
                        // Перезагружаем страницу для продолжения покупки
                        window.location.reload();
                        return true;
                    }
                } else {
                    console.log('❌ Кнопки оплаты не найдены, продолжаем поиск');
                }
            } else {
                // Обычный режим - обновляем статус после выбора всех билетов
                let statusEl = document.getElementById('rusloto-status');
                if (statusEl) {
                    const timeSpent = window.stolotoUtils.formatSearchTime();
                    statusEl.textContent = foundTicketsOnPage.length === 1
                        ? `Поиск завершён! Найден подходящий билет.\nПроверено билетов: ${state.ticketsChecked}, время: ${timeSpent}`
                        : `Поиск завершён! Найдено билетов: ${foundTicketsOnPage.length}.\nПроверено: ${state.ticketsChecked}, время: ${timeSpent}`;
                    statusEl.style.background = '#28a745'; // зеленый цвет только при полном завершении поиска
                }

                console.log('✅ Поиск успешно завершен');
                return true;
            }
        }
        
        if (!state.isSearching) return false;
        
        console.log('❌ Подходящий билет не найден на этой странице');
        
        const otherTicketsButton = Array.from(document.querySelectorAll('button')).find(
            btn => btn.textContent.trim() === 'Другие билеты'
        );
        
        if (otherTicketsButton) {
            console.log('Пробуем другие билеты...');
            
            // В режиме покупки обновляем и сохраняем состояние перед нажатием на кнопку
            if (state.isPurchaseMode) {
                state.purchaseTicketsChecked = state.ticketsChecked;
                state.purchaseStartTime = state.searchStartTime;
                await state.savePurchaseState();
            }
            
            otherTicketsButton.click();
            await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
            console.log('Кнопка "Другие билеты" не найдена');
            
            // В режиме покупки, если еще не достигли лимита, перезагружаем страницу
            if (state.isPurchaseMode && state.ticketsPurchased < state.totalTicketsToBuy) {
                console.log('Перезагружаем страницу для продолжения поиска билетов...');
                
                // Сохраняем состояние перед перезагрузкой
                state.purchaseTicketsChecked = state.ticketsChecked;
                state.purchaseStartTime = state.searchStartTime;
                await state.savePurchaseState();
                
                window.location.reload();
                return true;
            }
            
            break;
        }
    }
    
    if (!state.isPurchaseMode) {
        window.stolotoUI.removeStatusBlock();
    }
    return false;
}

// Экспорт функций в глобальное пространство
window.stolotoSearch = {
    clearSelection,
    analyzeTicket,
    findSuitableTicket
};
