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
    // Используем частичное совпадение для поддержки как десктопной (?int=header), так и мобильной (?int=sitemap) версий
    const walletLink = document.querySelector('a[href*="/private/wallet"]');
    if (walletLink) {
        console.log('Обнаружена ссылка на кошелек - пользователь авторизован');
        return true;
    }
    
    // Проверяем наличие ссылки "Мои билеты" - тоже надежный индикатор
    // Используем частичное совпадение для поддержки разных версий сайта (с параметрами и без)
    const myTicketsLink = document.querySelector('a[href*="/private/tickets"]');
    if (myTicketsLink) {
        console.log('Обнаружена ссылка "Мои билеты" - пользователь авторизован');
        return true;
    }
    
    // Проверяем наличие ссылки на бонусы - дополнительный индикатор для мобильной версии
    const bonusLink = document.querySelector('a[href*="/private/bonus"]');
    if (bonusLink) {
        console.log('Обнаружена ссылка "Бонусы" - пользователь авторизован');
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
    // Используем частичное совпадение для поддержки как десктопной, так и мобильной версий
    const walletLink = document.querySelector('a[href*="/private/wallet"]');
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
    
    // Дополнительный поиск - если основной метод не сработал, ищем по тексту с рублевым символом
    const allLinks = document.querySelectorAll('a');
    for (const link of allLinks) {
        const linkText = link.textContent.trim();
        // Ищем ссылки, содержащие символ рубля и указывающие на кошелек
        if (linkText.includes('₽') && link.href && link.href.includes('/private/wallet')) {
            console.log('Найдена альтернативная ссылка с балансом:', linkText);
            const matches = linkText.match(/(\d+(?:\s\d+)*)\s*₽/);
            if (matches) {
                const balanceValue = parseInt(matches[1].replace(/\s/g, ''));
                console.log('Баланс пользователя (альтернативный поиск):', balanceValue);
                return balanceValue;
            }
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
