/**
 * Auth Module - Работа с авторизацией и балансом
 * Отвечает за проверку авторизации пользователя и получение баланса
 */

// Функция для проверки, авторизован ли пользователь на сайте
function isUserLoggedIn() {
    // Метод 1: Проверка наличия меню профиля - самый надежный индикатор
    const profileMenu = document.querySelector('[data-test-id="profile-menu"], .profile-menu, .user-profile');
    
    // Метод 2: Проверка наличия аватара пользователя
    const userAvatar = document.querySelector('.user-avatar, .account-avatar, [data-test-id="user-avatar"]');
    
    // Метод 3: Проверка наличия имени пользователя или персонального меню
    const userNameElement = document.querySelector('.profile-name, .user-name, .account-name');
    
    // Метод 4: Проверка наличия блока "Мой кабинет" или "Личный кабинет"
    const personalCabinetElements = Array.from(document.querySelectorAll('a, span, div, button'));
    const personalCabinetElement = personalCabinetElements.find(
        el => {
            if (!el || !el.textContent) return false;
            const text = el.textContent.trim().toLowerCase();
            return text === 'мой кабинет' || text === 'личный кабинет' || text.includes('личный') && text.includes('кабинет');
        }
    );
    
    // Метод 5: Проверка наличия меню кошелька, баланса или счета 
    const walletElement = document.querySelector('.user-balance, .wallet, [data-test-id="user-balance"]');
    
    // Метод 6: Конкретная проверка на блок входа (если видим этот блок - пользователь НЕ авторизован)
    const loginElements = Array.from(document.querySelectorAll('div, a, button, span'));
    const specificAuthBlock = loginElements.find(
        el => {
            if (!el || !el.textContent) return false;
            const text = el.textContent.trim().toLowerCase();
            return text === 'вход и регистрация' || text === 'войти' || text === 'вход';
        }
    );
    
    // Метод 7: Поиск подписи с username или email
    const possibleUsernames = Array.from(document.querySelectorAll('span, div')).filter(
        el => el.textContent && el.textContent.includes('@') && el.textContent.length < 40
    );
    
    // Вывод для отладки
    console.log('Проверка авторизации:', { 
        'profileMenu': !!profileMenu, 
        'userAvatar': !!userAvatar,
        'userNameElement': !!userNameElement,
        'personalCabinetElement': !!personalCabinetElement,
        'walletElement': !!walletElement,
        'specificAuthBlock': !!specificAuthBlock,
        'possibleUsernames': possibleUsernames.length > 0
    });
    
    // Проверяем наличие индикаторов авторизованного пользователя
    const hasProfileIndicators = !!(profileMenu || userAvatar || userNameElement || personalCabinetElement || walletElement || possibleUsernames.length > 0);
    
    // Если есть конкретный блок "Вход и регистрация", то пользователь НЕ авторизован,
    // иначе проверяем наличие хотя бы одного индикатора профиля
    if (specificAuthBlock) {
        console.log('Обнаружен блок входа/регистрации - пользователь НЕ авторизован');
        return false;
    } else if (hasProfileIndicators) {
        console.log('Обнаружены индикаторы профиля - пользователь авторизован');
        return true;
    } else {
        // Если документ еще загружается, даем ему время и проверяем еще раз
        if (document.readyState !== 'complete') {
            console.log('Документ еще не полностью загружен, продолжаем проверку...');
            // При повторном вызове важно не попасть в бесконечную рекурсию,
            // поэтому просто возвращаем true если документ еще грузится
            return true;
        }
        
        // Если никаких признаков не найдено и документ загружен полностью, считаем что пользователь не авторизован
        console.log('Не обнаружено индикаторов профиля - пользователь НЕ авторизован');
        return false;
    }
}

// Функция для получения баланса пользователя
function getUserBalance() {
    // Проверяем, авторизован ли пользователь
    if (!isUserLoggedIn()) {
        console.log('Невозможно получить баланс: пользователь не авторизован');
        return 0;
    }
    
    console.log('Начинаем поиск баланса пользователя...');
    
    // Метод 1: Поиск баланса в указанном формате (Account_balance)
    const accountBalanceElement = document.querySelector('.Account_balance__pONDE, .Account_accountLink__Hi6eY span');
    if (accountBalanceElement) {
        console.log('Найден элемент баланса аккаунта:', accountBalanceElement.textContent);
        const text = accountBalanceElement.textContent.trim();
        const matches = text.match(/(\d+([.,]\d+)?)/);
        if (matches) {
            const balanceValue = parseFloat(matches[1].replace(',', '.'));
            console.log('Баланс из элемента аккаунта:', balanceValue);
            return balanceValue;
        }
    }
    
    // Метод 2: Поиск по ссылке на кошелек с балансом
    const walletLinks = Array.from(document.querySelectorAll('a[href*="wallet"], a[href*="personal"]'));
    for (const link of walletLinks) {
        console.log('Проверка ссылки на кошелек:', link.textContent);
        if (link.textContent.includes('₽') || link.textContent.includes('руб')) {
            const text = link.textContent.trim();
            const matches = text.match(/(\d+([.,]\d+)?)/);
            if (matches) {
                const balanceValue = parseFloat(matches[1].replace(',', '.'));
                console.log('Баланс из ссылки на кошелек:', balanceValue);
                return balanceValue;
            }
        }
    }
    
    // Метод 3: Ищем элементы, которые могут содержать информацию о балансе
    const balanceElements = Array.from(document.querySelectorAll('.user-balance, .balance, .wallet-balance, [data-test-id="user-balance"]'));
    
    // Ищем также в блоке профиля пользователя
    const profileElements = Array.from(document.querySelectorAll('.profile-menu, .user-profile, .account-info'));
    
    let balanceText = '';
    
    // Сначала проверяем специальные элементы баланса
    for (const element of balanceElements) {
        console.log('Проверка элемента баланса:', element.textContent);
        balanceText = element.textContent.trim();
        if (balanceText) break;
    }
    
    // Если баланс не найден, проверяем в блоке профиля
    if (!balanceText) {
        for (const element of profileElements) {
            // Ищем числа в тексте элемента, которые могут быть балансом
            const text = element.textContent.trim();
            console.log('Проверка элемента профиля:', text);
            const matches = text.match(/\d+([.,]\d+)?/);
            if (matches) {
                balanceText = matches[0];
                break;
            }
        }
    }
    
    // Если баланс все еще не найден, ищем в любых элементах, содержащих цифры рядом с "₽" или "руб"
    if (!balanceText) {
        console.log('Поиск баланса по всем элементам страницы с символом валюты...');
        // Метод 4: Поиск по всем span, содержащим символ валюты
        const currencySpans = Array.from(document.querySelectorAll('span, div, a')).filter(
            el => el.textContent && (
                el.textContent.includes('₽') || 
                el.textContent.includes('руб') || 
                el.textContent.includes('Р') || 
                el.textContent.includes('р.')
            )
        );
        
        for (const span of currencySpans) {
            console.log('Проверка элемента с валютой:', span.textContent);
            const text = span.textContent.trim();
            const matches = text.match(/(\d+([.,]\d+)?)\s*(₽|руб|Р|р\.)/);
            if (matches) {
                balanceText = matches[1];
                console.log('Найден баланс в элементе с валютой:', balanceText);
                break;
            }
        }
        
        // Метод 5: Общий поиск по всем элементам страницы
        if (!balanceText) {
            const anyElements = Array.from(document.querySelectorAll('*'));
            for (const element of anyElements) {
                if (element.childNodes.length === 0 || element.tagName === 'SPAN' || element.tagName === 'A') {
                    const text = element.textContent.trim();
                    // Ищем цифры рядом с символом валюты
                    const matches = text.match(/(\d+([.,]\d+)?)\s*(₽|руб|Р|р\.)/);
                    if (matches) {
                        balanceText = matches[1];
                        console.log('Найден баланс в общем поиске:', balanceText, 'в элементе:', element.tagName);
                        break;
                    }
                }
            }
        }
    }
    
    console.log('Итоговый найденный текст баланса:', balanceText);
    
    // Преобразуем текст в число
    if (balanceText) {
        // Заменяем запятую на точку для корректного преобразования
        balanceText = balanceText.replace(',', '.');
        // Извлекаем только цифры и точку
        const balanceValue = parseFloat(balanceText.replace(/[^\d.]/g, ''));
        console.log('Баланс пользователя:', balanceValue);
        return balanceValue || 0;
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
