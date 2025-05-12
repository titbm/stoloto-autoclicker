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

button.addEventListener('click', async () => {
    if (!isSearching) {
        // Начинаем поиск
        const numbers = parseNumbers(numbersInput.value);
        const excludeNumbers = parseNumbers(excludeNumbersInput.value);        if (numbers.length === 0) {
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
