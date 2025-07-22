/**
 * UI Module - Управление пользовательским интерфейсом
 * Отвечает за отображение состояния и предупреждений
 */

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
    white-space: pre-line;
`;

// Функция для создания/обновления блока состояния
function updateStatusBlock(numbers, excludeNumbers, mode) {
    const state = window.stolotoState;
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
        : '';
    const ticketsText = state.ticketsChecked > 0 ? `Проверено билетов: ${state.ticketsChecked}` : '';
    const timeText = state.searchStartTime ? `Время поиска: ${window.stolotoUtils.formatSearchTime()}` : '';
    
    let statusText = `Ищем числа ${numbersText}${excludeText} ${modeText}`;
    
    // Добавляем информацию о поиске
    if (ticketsText || timeText) {
        statusText += `\n${ticketsText}${ticketsText && timeText ? '. ' : ''}${timeText}`;
    }
    // Если активен режим покупки, добавляем информацию о нём
    if (state.isPurchaseMode) {
        const purchaseText = `Автоматическая покупка. Куплено билетов: ${state.ticketsPurchased} из ${state.totalTicketsToBuy}`;
        statusText += `\n${purchaseText}`;
        
        // Меняем цвет только когда процесс покупки завершен
        if (state.ticketsPurchased >= state.totalTicketsToBuy) {
            statusEl.style.background = '#28a745'; // зеленый - завершено
        } else {
            // В процессе поиска сохраняем стандартный синий цвет
            statusEl.style.background = '#007bff';
        }
    }
    
    statusEl.textContent = statusText;
}

// Функция для удаления блока состояния
function removeStatusBlock() {
    const statusEl = document.getElementById('rusloto-status');
    if (statusEl) {
        statusEl.remove();
    }
}

// Функция для отображения предупреждения о необходимости авторизации
function showAuthWarning() {
    let warningEl = document.getElementById('rusloto-auth-warning');
    if (!warningEl) {
        warningEl = document.createElement('div');
        warningEl.id = 'rusloto-auth-warning';
        warningEl.style.cssText = `
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            background: #dc3545;
            color: white;
            padding: 10px 20px;
            font-size: 16px;
            z-index: 10000;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        warningEl.textContent = 'Для использования режима автоматической покупки необходимо авторизоваться на сайте Столото!';
        document.body.appendChild(warningEl);
    }
    
    // Скрываем предупреждение через 5 секунд
    setTimeout(() => {
        if (warningEl && warningEl.parentNode) {
            warningEl.remove();
        }
    }, 5000);
}

// Функция для отображения предупреждения о недостатке средств
function showInsufficientFundsWarning(ticketsToBuy) {
    const ticketPrice = 150;
    const userBalance = window.stolotoAuth.getUserBalance();
    const requiredAmount = ticketPrice * ticketsToBuy;
    
    console.log(`Показываем предупреждение о недостатке средств. Баланс: ${userBalance}, Требуется: ${requiredAmount}`);
    
    let warningEl = document.getElementById('rusloto-funds-warning');
    if (!warningEl) {
        warningEl = document.createElement('div');
        warningEl.id = 'rusloto-funds-warning';
        warningEl.style.cssText = `
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            background: #dc3545;
            color: white;
            padding: 10px 20px;
            font-size: 16px;
            z-index: 10000;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        warningEl.textContent = `Недостаточно средств! Для покупки ${ticketsToBuy} билетов требуется ${requiredAmount} руб. На счету: ${userBalance} руб.`;
        document.body.appendChild(warningEl);
    } else {
        // Обновляем текст, если предупреждение уже существует
        warningEl.textContent = `Недостаточно средств! Для покупки ${ticketsToBuy} билетов требуется ${requiredAmount} руб. На счету: ${userBalance} руб.`;
        warningEl.style.display = 'block';
    }
    
    // Скрываем предупреждение через 7 секунд
    setTimeout(() => {
        if (warningEl && warningEl.parentNode) {
            warningEl.remove();
        }
    }, 7000);
}

// Экспорт функций в глобальное пространство
window.stolotoUI = {
    updateStatusBlock,
    removeStatusBlock,
    showAuthWarning,
    showInsufficientFundsWarning
};
