/**
 * Search Module - Логика поиска и анализа билетов
 * Отвечает за анализ билетов и очистку выбора
 */

// Функция очистки выбранных чисел
async function clearSelection() {
    // Находим и нажимаем кнопку "Сбросить" (обновленная структура сайта)
    const clearButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.trim() === 'Сбросить'
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
    
    // Получаем все числа из дочерних generic элементов билета
    const numberElements = Array.from(ticket.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.trim();
        if (!text) return false;
        const num = parseInt(text);
        return !isNaN(num) && num >= 1 && num <= 90 && text === num.toString();
    });
    
    if (numberElements.length === 0) {
        console.log('Не найдены числовые элементы в билете');
        return false;
    }
    
    const ticketNumbers = numberElements.map(el => parseInt(el.textContent.trim()));
    
    // Берем только первые 30 чисел (на случай если есть лишние)
    const validNumbers = ticketNumbers.slice(0, 30);
    
    // Извлекаем номер билета из текста для отладки
    const ticketText = ticket.textContent || '';
    const ticketNumber = ticketText.match(/Билет №(\d+)/)?.[1] || 'неизвестен';
    
    console.log(`\n=== АНАЛИЗ БИЛЕТА ${ticketNumber} ===`);
    console.log('Найденные элементы с числами:', numberElements.length);
    console.log('Извлечены числа:', validNumbers);
    console.log('Количество чисел:', validNumbers.length);
    console.log('Ищем числа:', numbers);
    
    if (validNumbers.length !== 30) {
        console.log('❌ Неверное количество чисел в билете:', validNumbers.length);
        return false;
    }
    
    // Разделяем числа на 6 строк по 5 чисел в каждой (как в реальном билете)
    const rows = [];
    for (let i = 0; i < 6; i++) {
        const startIndex = i * 5;
        rows.push(validNumbers.slice(startIndex, startIndex + 5));
    }
    
    console.log('Строки билета:');
    rows.forEach((row, i) => console.log(`Строка ${i + 1}:`, row));

    // Проверяем, нет ли исключаемых чисел в билете
    const excludeNumbers = state.isPurchaseMode ? state.purchaseExcludeNumbers : state.excludeNumbers;
    console.log('Исключаемые числа:', excludeNumbers);
    if (excludeNumbers && excludeNumbers.length > 0) {
        const hasExcluded = excludeNumbers.some(num => validNumbers.includes(parseInt(num)));
        if (hasExcluded) {
            console.log('❌ В билете найдены исключаемые числа:', excludeNumbers.filter(num => validNumbers.includes(parseInt(num))));
            return false;
        }
    }

    const searchMode = state.isPurchaseMode ? state.purchaseSearchMode : state.searchMode;
    console.log('Режим поиска:', searchMode);
    
    switch (searchMode) {
        case 'row': {
            // Проверяем каждую строку
            for (const row of rows) {
                const allInRow = numbers.every(num => row.includes(parseInt(num)));
                if (allInRow) {
                    console.log('✅ Все числа найдены в одной строке!');
                    return true;
                }
            }
            return false;
        }
        case 'half': {
            // Первая половина - первые три строки
            const firstHalf = rows.slice(0, 3).flat();

            // Вторая половина - последние три строки
            const secondHalf = rows.slice(3).flat();

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
            const allFound = numbers.every(num => validNumbers.includes(parseInt(num)));
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
        // Ищем все билеты (новая структура - кнопки с текстом "Билет №")
        const tickets = Array.from(document.querySelectorAll('button')).filter(btn => 
            btn.textContent.includes('Билет №')
        );
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
            
            const excludeNumbers = state.isPurchaseMode ? state.purchaseExcludeNumbers : state.excludeNumbers;
            const mode = state.isPurchaseMode ? state.purchaseSearchMode : state.searchMode;
            window.stolotoUI.updateStatusBlock(numbers, excludeNumbers, mode);
            
            if (analyzeTicket(ticket, numbers)) {
                // Извлекаем номер билета из текста кнопки (новая структура)
                const ticketText = ticket.textContent || '';
                const ticketNumber = ticketText.match(/Билет №(\d+)/)?.[1] || 'неизвестен';
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
                
                // Извлекаем номер билета из текста кнопки (новая структура)
                const ticketText = ticket.textContent || '';
                const ticketNumber = ticketText.match(/Билет №(\d+)/)?.[1] || 'неизвестен';
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
