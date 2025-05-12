const button = document.getElementById('startButton');
const numbersInput = document.getElementById('numbers');
const excludeNumbersInput = document.getElementById('excludeNumbers');
const searchMode = document.getElementById('searchMode');
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
async function saveSearchParams(numbers, excludeNumbers, mode) {
    await chrome.storage.local.set({
        lastSearch: {
            numbers: numbers,
            excludeNumbers: excludeNumbers,
            mode: mode,
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
    }
}

// Загружаем последние параметры при открытии popup
document.addEventListener('DOMContentLoaded', loadLastSearchParams);

button.addEventListener('click', async () => {
    if (!isSearching) {
        // Начинаем поиск
        const numbers = parseNumbers(numbersInput.value);
        const excludeNumbers = parseNumbers(excludeNumbersInput.value);
        
        // Сохраняем параметры поиска
        await saveSearchParams(numbers, excludeNumbers, searchMode.value);if (numbers.length === 0) {
            alert('Пожалуйста, введите корректные числа от 1 до 90');
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, {
            action: 'clickNumbers',
            numbers: numbers,
            excludeNumbers: excludeNumbers,
            mode: searchMode.value
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
        // Останавливаем поиск
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, { action: 'stopSearch' }, () => {
            isSearching = false;
            button.textContent = 'Запустить';
            button.classList.remove('stop');
            button.classList.add('start');
        });
    }
});
