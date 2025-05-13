const button = document.getElementById('startButton');
const numbersInput = document.getElementById('numbers');
const excludeNumbersInput = document.getElementById('excludeNumbers');
const searchMode = document.getElementById('searchMode');
const purchaseModeCheckbox = document.getElementById('purchaseModeCheckbox'); // Новый элемент
const ticketsToBuyCountInput = document.getElementById('ticketsToBuyCount'); // Новый элемент
button.classList.add('start');
let isSearching = false;

function parseNumbers(input) {
    return input.split(',')
        .map(num => num.trim())
        .filter(num => {
            const n = parseInt(num);
            return !isNaN(n) && n >= 1 && n <= 90;
        });
}

// Функция сохранения параметров поиска
async function saveSearchParams(numbers, excludeNumbers, mode, purchaseMode, ticketsToBuy) { // Добавлены параметры
    await chrome.storage.local.set({
        lastSearch: {
            numbers: numbers,
            excludeNumbers: excludeNumbers,
            mode: mode,
            purchaseMode: purchaseMode, // Сохраняем режим покупки
            ticketsToBuy: ticketsToBuy, // Сохраняем количество билетов
            timestamp: Date.now()
        }
    });
}

// Функция загрузки последних параметров поиска
async function loadLastSearchParams() {
    const data = await chrome.storage.local.get('lastSearch');
    if (data.lastSearch) {
        numbersInput.value = data.lastSearch.numbers.join(', ');
        excludeNumbersInput.value = data.lastSearch.excludeNumbers.join(', ');
        searchMode.value = data.lastSearch.mode;
        purchaseModeCheckbox.checked = data.lastSearch.purchaseMode || false; // Загружаем режим покупки
        ticketsToBuyCountInput.value = data.lastSearch.ticketsToBuy || 1; // Загружаем количество билетов
    }
}

// Загружаем последние параметры при открытии popup
document.addEventListener('DOMContentLoaded', loadLastSearchParams);

button.addEventListener('click', async () => {
    if (!isSearching) {
        // Начинаем поиск/покупку
        const numbers = parseNumbers(numbersInput.value);
        const excludeNumbers = parseNumbers(excludeNumbersInput.value);
        const mode = searchMode.value;
        const purchaseMode = purchaseModeCheckbox.checked; // Получаем состояние чек-бокса
        const ticketsToBuy = parseInt(ticketsToBuyCountInput.value, 10); // Получаем количество билетов

        // Сохраняем параметры поиска
        await saveSearchParams(numbers, excludeNumbers, mode, purchaseMode, ticketsToBuy); // Передаем новые параметры

        if (numbers.length === 0 && !purchaseMode) { 
            alert('Пожалуйста, введите корректные числа от 1 до 90 для поиска');
            return;
        }
        if (purchaseMode && ticketsToBuy < 1) {
            alert('Количество билетов для покупки должно быть не меньше 1');
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, {
            action: 'startAction', // Изменим action на более общий
            numbers: numbers,
            excludeNumbers: excludeNumbers,
            mode: mode,
            isPurchaseMode: purchaseMode, // Передаем режим покупки
            ticketsToBuyTotal: ticketsToBuy // Передаем количество билетов
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Ошибка:', chrome.runtime.lastError);
                alert('Ошибка: убедитесь, что вы находитесь на странице Столото');
            } else {
                console.log('Начат поиск билета');
                isSearching = true;
                button.textContent = 'Остановить';
                button.classList.remove('start');
                button.classList.add('stop');
            }
        });
    } else {
        // Останавливаем поиск/покупку
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, { action: 'stopSearch' }, () => {
            isSearching = false;
            button.textContent = 'Запустить';
            button.classList.remove('stop');
            button.classList.add('start');
        });
    }
});
