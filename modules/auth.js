/**
 * Auth Module - Работа с авторизацией и балансом
 * Отвечает за проверку авторизации пользователя и получение баланса
 */

// Функция для проверки, авторизован ли пользователь на сайте
function isUserLoggedIn() {
    // Проверяем наличие ссылки "Вход и регистрация" - если есть, то НЕ авторизован
    const loginLink = document.querySelector('a[href*="/auth"]');
    if (loginLink && loginLink.textContent.includes('Вход и регистрация')) {
        console.log('Обнаружена ссылка "Вход и регистрация" - пользователь НЕ авторизован');
        return false;
    }
    
    // Проверяем наличие ссылки на кошелек - надежный индикатор авторизации
    const walletLink = document.querySelector('a[href="/private/wallet?int=header"]');
    if (walletLink) {
        console.log('Обнаружена ссылка на кошелек - пользователь авторизован');
        return true;
    }
    
    // Проверяем наличие ссылки "Мои билеты" - тоже надежный индикатор
    const myTicketsLink = document.querySelector('a[href="/private/tickets/all?int=header"]');
    if (myTicketsLink) {
        console.log('Обнаружена ссылка "Мои билеты" - пользователь авторизован');
        return true;
    }
    
    // Если ничего не найдено, считаем неавторизованным
    console.log('Индикаторы авторизации не найдены - пользователь НЕ авторизован');
    return false;
}

// Функция для получения баланса пользователя
function getUserBalance() {
    // Проверяем, авторизован ли пользователь
    if (!isUserLoggedIn()) {
        console.log('Невозможно получить баланс: пользователь не авторизован');
        return 0;
    }
    
    console.log('Начинаем поиск баланса пользователя...');
    
    // Ищем ссылку на кошелек - надежный способ получить баланс
    const walletLink = document.querySelector('a[href="/private/wallet?int=header"]');
    if (walletLink) {
        const balanceText = walletLink.textContent.trim();
        console.log('Найден текст баланса в ссылке на кошелек:', balanceText);
        
        // Извлекаем число из текста формата "1 500 ₽"
        const matches = balanceText.match(/(\d+(?:\s\d+)*)\s*₽/);
        if (matches) {
            // Убираем пробелы между цифрами и преобразуем в число
            const balanceValue = parseInt(matches[1].replace(/\s/g, ''));
            console.log('Баланс пользователя:', balanceValue);
            return balanceValue;
        }
    }
    
    console.log('Не удалось найти баланс пользователя');
    return 0;
}

// Функция для проверки достаточности средств
function hasEnoughFunds(ticketsToBuy) {
    const ticketPrice = 150; // Стоимость одного билета
    const requiredAmount = ticketPrice * ticketsToBuy;
    const userBalance = getUserBalance();
    
    console.log(`Проверка средств: ${userBalance} руб. на счету, требуется ${requiredAmount} руб. для ${ticketsToBuy} билетов`);
    
    return userBalance >= requiredAmount;
}

// Экспорт функций в глобальное пространство
window.stolotoAuth = {
    isUserLoggedIn,
    getUserBalance,
    hasEnoughFunds
};
