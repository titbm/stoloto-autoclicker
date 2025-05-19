const button = document.getElementById('startButton');
const numbersInput = document.getElementById('numbers');
const excludeNumbersInput = document.getElementById('excludeNumbers');
const searchMode = document.getElementById('searchMode');
const testPurchaseModeCheckbox = document.getElementById('testPurchaseMode');
const purchaseOptionsContainer = document.getElementById('purchaseOptionsContainer');
const authWarningElement = document.getElementById('authWarning');
const ticketsToBuyInput = document.getElementById('ticketsToBuy');
const fundsWarningElement = document.getElementById('fundsWarning'); // Элемент для предупреждения о балансе

button.classList.add('start');
let isSearching = false;
let isUserAuthenticated = false;
const TICKET_PRICE = 150; // Стоимость одного билета

// Проверка авторизации из хранилища
async function checkAuthFromStorage() {
    try {
        const data = await chrome.storage.local.get('authStatus');
        if (data.authStatus) {
            // Если данных о статусе авторизации есть и не старше 10 секунд (уменьшили время для большей точности)
            const isRecent = (Date.now() - data.authStatus.timestamp) < 10 * 1000;
            
            if (isRecent) {
                isUserAuthenticated = data.authStatus.isLoggedIn;
                console.log('Статус авторизации из хранилища (свежий):', isUserAuthenticated);
                return isUserAuthenticated;
            } else {
                console.log('Данные авторизации устарели, запрашиваем актуальные');
            }
        } else {
            console.log('Данных о статусе авторизации нет в хранилище');
        }
        
        // Если данных нет или они устарели, пробуем запросить у активной вкладки
        return await checkActiveTabAuth();
    } catch (error) {
        console.error('Ошибка при проверке авторизации из хранилища:', error);
        // Возвращаем false в случае ошибки
        return false;
    }
}

// Проверка авторизации через активную вкладку 
async function checkActiveTabAuth() {
    try {
        // Проверяем, есть ли активная вкладка со Столото
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Если нет активной вкладки, считаем что пользователь не авторизован
        if (!tabs || tabs.length === 0) {
            console.log('Нет активной вкладки для проверки авторизации');
            return false;
        }
        
        console.log('Отправляем запрос на проверку авторизации в tab:', tabs[0].id);
        
        // Пробуем отправить сообщение content script
        return new Promise((resolve) => {
            chrome.tabs.sendMessage(
                tabs[0].id, 
                { action: 'checkUserLogin' }, 
                (response) => {
                    // Если ошибка, считаем что не авторизован
                    if (chrome.runtime.lastError) {
                        console.log('Не удалось проверить авторизацию:', chrome.runtime.lastError.message);
                        resolve(false);
                        return;
                    }
                    
                    // Если получили ответ, берем статус из него
                    if (response && response.isLoggedIn !== undefined) {
                        isUserAuthenticated = response.isLoggedIn;
                        console.log('Получен статус авторизации от страницы:', isUserAuthenticated);
                        
                        // Сохраняем полученный статус в хранилище
                        chrome.storage.local.set({
                            authStatus: {
                                isLoggedIn: isUserAuthenticated,
                                timestamp: Date.now()
                            }
                        });
                        
                        resolve(isUserAuthenticated);
                    } else {
                        // Если ответ некорректный
                        console.log('Некорректный ответ от content script:', response);
                        resolve(false);
                    }
                }
            );
            
            // Устанавливаем таймаут на случай, если ответ не придет
            setTimeout(() => {
                console.log('Таймаут при проверке авторизации');
                resolve(false);
            }, 1000);
        });
    } catch (error) {
        console.error('Ошибка при проверке авторизации через вкладку:', error);
        return false;
    }
}

// Обновляем UI в зависимости от статуса авторизации
function updateAuthDependentUI() {
    console.log('Обновление UI, статус авторизации:', isUserAuthenticated);
    
    // Если пользователь не авторизован:
    if (!isUserAuthenticated) {
        // Отключаем чекбокс режима покупки
        testPurchaseModeCheckbox.disabled = true;
        
        // Обновляем текст предупреждения
        authWarningElement.innerHTML = '<strong>Внимание!</strong> Для автоматической покупки необходимо авторизоваться на сайте Столото.';
        
        // Показываем предупреждение
        authWarningElement.style.display = 'block';
        
        // Снимаем отметку с чекбокса и скрываем настройки
        testPurchaseModeCheckbox.checked = false;
        purchaseOptionsContainer.style.display = 'none';
    } else {
        // Если пользователь авторизован:
        // Включаем чекбокс
        testPurchaseModeCheckbox.disabled = false;
        
        // Скрываем предупреждение
        authWarningElement.style.display = 'none';
        
        // Сохраняем состояние авторизации
        console.log('Сохраняем состояние авторизации в хранилище:', isUserAuthenticated);
        chrome.storage.local.set({
            authStatus: {
                isLoggedIn: isUserAuthenticated,
                timestamp: Date.now()
            }
        });
    }
}

// Показывать/скрывать настройки режима покупки
testPurchaseModeCheckbox.addEventListener('change', async function() {
    if (this.checked) {
        // При активации режима покупки принудительно проверяем авторизацию 
        // через content script (более надежная проверка)
        console.log('Проверка авторизации перед активацией режима покупки...');
        
        // Сначала отключаем переключатель, чтобы избежать случайных нажатий
        this.disabled = true;
        
        try {
            // Проверка через активную вкладку - самая надежная проверка
            const authResult = await checkActiveTabAuth();
              if (!authResult) {
                console.log('Пользователь не авторизован, но пытается включить режим покупки');
                alert('Для использования автоматической покупки необходимо авторизоваться на сайте Столото!');
                
                // Отключаем чекбокс без вызова события change
                this.checked = false;
                purchaseOptionsContainer.style.display = 'none';
                
                // Обновляем UI для отображения предупреждения
                updateAuthDependentUI();
                this.disabled = false;
                return;
            }
            
            // Если пользователь авторизован, показываем настройки
            purchaseOptionsContainer.style.display = 'block';
            
            // Проверяем баланс для валидации
            if (parseInt(ticketsToBuyInput.value) > 0) {
                const balanceInfo = await checkUserBalance(parseInt(ticketsToBuyInput.value));
                
                if (!balanceInfo.hasEnoughFunds) {
                    // Показываем предупреждение о недостаточности средств
                    showInsufficientFundsWarning(balanceInfo.balance, parseInt(ticketsToBuyInput.value));
                } else {
                    // Скрываем предупреждение, если оно было
                    hideInsufficientFundsWarning();
                }
            }
        } catch (error) {
            console.error('Ошибка при проверке авторизации:', error);
            // В случае ошибки отключаем чекбокс
            this.checked = false;
            purchaseOptionsContainer.style.display = 'none';
        } finally {
            // В любом случае разблокируем переключатель
            this.disabled = false;
        }
    } else {
        // Если режим выключен, скрываем настройки
        purchaseOptionsContainer.style.display = 'none';
        
        // Скрываем предупреждение о недостаточности средств, если оно было
        hideInsufficientFundsWarning();
    }
});

function parseNumbers(input) {
    return input.split(',')
        .map(num => num.trim())
        .filter(num => {
            const n = parseInt(num);
            return !isNaN(n) && n >= 1 && n <= 90;
        });
}

// Функция сохранения параметров поиска
async function saveSearchParams(numbers, excludeNumbers, mode, isPurchaseMode, ticketsToBuy) {
    await chrome.storage.local.set({
        lastSearch: {
            numbers: numbers,
            excludeNumbers: excludeNumbers,
            mode: mode,
            isPurchaseMode: isPurchaseMode,
            ticketsToBuy: ticketsToBuy,
            timestamp: Date.now()
        }
    });
}

// Функция загрузки последних параметров поиска
async function loadLastSearchParams() {
    const data = await chrome.storage.local.get('lastSearch');
    if (data.lastSearch) {
        // Восстанавливаем базовые настройки
        numbersInput.value = data.lastSearch.numbers.join(', ');
        excludeNumbersInput.value = data.lastSearch.excludeNumbers.join(', ');
        searchMode.value = data.lastSearch.mode;
        
        // Проверяем текущий статус авторизации еще раз
        const currentAuthStatus = await checkAuthFromStorage();
        
        // Восстанавливаем настройки режима покупки только если пользователь авторизован
        if (data.lastSearch.isPurchaseMode && currentAuthStatus) {
            console.log('Восстанавливаем настройки режима покупки, пользователь авторизован');
            testPurchaseModeCheckbox.checked = true;
            purchaseOptionsContainer.style.display = 'block';
            ticketsToBuyInput.value = data.lastSearch.ticketsToBuy || 1;
        } else if (data.lastSearch.isPurchaseMode && !currentAuthStatus) {
            console.log('Режим покупки был активен, но пользователь не авторизован');
            testPurchaseModeCheckbox.checked = false;
            purchaseOptionsContainer.style.display = 'none';
        }
    }
}

// Функция проверки достаточности средств
async function checkUserBalance(ticketsToBuy) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
            console.error('Не удалось найти активную вкладку для проверки баланса');
            return { hasEnoughFunds: false, balance: 0 };
        }
        
        return new Promise((resolve) => {
            // Сначала убедимся, что пользователь авторизован
            chrome.tabs.sendMessage(
                tab.id, 
                { action: 'checkUserLogin' }, 
                (authResponse) => {
                    if (chrome.runtime.lastError) {
                        console.error('Ошибка при проверке авторизации:', chrome.runtime.lastError);
                        resolve({ hasEnoughFunds: false, balance: 0 });
                        return;
                    }
                    
                    if (!authResponse || !authResponse.isLoggedIn) {
                        console.log('Пользователь не авторизован, невозможно проверить баланс');
                        resolve({ hasEnoughFunds: false, balance: 0 });
                        return;
                    }
                    
                    // Если пользователь авторизован, проверяем баланс
                    chrome.tabs.sendMessage(
                        tab.id, 
                        { action: 'checkUserBalance', ticketsToBuy: ticketsToBuy }, 
                        (response) => {
                            if (chrome.runtime.lastError) {
                                console.error('Ошибка при проверке баланса:', chrome.runtime.lastError);
                                resolve({ hasEnoughFunds: false, balance: 0 });
                                return;
                            }
                            
                            if (response && response.balance !== undefined) {
                                console.log('Получен баланс:', response.balance, 'руб.');
                                console.log('Требуется:', ticketsToBuy * TICKET_PRICE, 'руб.');
                                resolve({ 
                                    hasEnoughFunds: response.hasEnoughFunds, 
                                    balance: response.balance 
                                });
                            } else {
                                console.log('Некорректный ответ при проверке баланса:', response);
                                resolve({ hasEnoughFunds: false, balance: 0 });
                            }
                        }
                    );
                }
            );
            
            // Устанавливаем таймаут на случай, если ответ не придет
            setTimeout(() => {
                console.log('Таймаут при проверке баланса');
                resolve({ hasEnoughFunds: false, balance: 0 });
            }, 1500); // Увеличиваем таймаут для более надежной проверки
        });
    } catch (error) {
        console.error('Ошибка при проверке баланса:', error);
        return { hasEnoughFunds: false, balance: 0 };
    }
}

// Функция для показа предупреждения о недостаточности средств
function showInsufficientFundsWarning(balance, ticketsToBuy) {
    const requiredAmount = TICKET_PRICE * ticketsToBuy;
    
    // Сначала найдем элемент по глобальной переменной
    let warningElement = window.fundsWarningElement;
    
    // Если не найден по глобальной переменной, ищем по ID
    if (!warningElement) {
        warningElement = document.getElementById('fundsWarning');
    }
    
    // Если элемент все еще не найден, создаем его
    if (!warningElement) {
        warningElement = document.createElement('div');
        warningElement.id = 'fundsWarning';
        warningElement.style.color = '#dc3545';
        warningElement.style.backgroundColor = '#f8d7da';
        warningElement.style.padding = '5px';
        warningElement.style.borderRadius = '4px';
        warningElement.style.fontSize = '0.85em';
        warningElement.style.marginTop = '5px';
        
        // Вставляем предупреждение после блока с настройками количества билетов
        const ticketsContainer = document.querySelector('#purchaseOptionsContainer');
        if (ticketsContainer) {
            ticketsContainer.appendChild(warningElement);
        } else {
            // Если не найден контейнер настроек, добавляем в body
            document.body.appendChild(warningElement);
        }
    }
    
    console.log(`Показываем предупреждение о недостатке средств: Баланс ${balance}, требуется ${requiredAmount}`);
    
    // Сохраняем ссылку на элемент в глобальной переменной
    window.fundsWarningElement = warningElement;
    
    // Обновляем текст предупреждения
    warningElement.innerHTML = `<strong>Внимание!</strong> Недостаточно средств! Для покупки ${ticketsToBuy} билетов требуется ${requiredAmount} руб. На счету: ${balance} руб.`;
    warningElement.style.display = 'block';
    
    // Обновляем визуальные стили для гарантии правильного отображения
    warningElement.style.color = '#dc3545';
    warningElement.style.backgroundColor = '#f8d7da';
    warningElement.style.padding = '5px';
    warningElement.style.borderRadius = '4px';
    warningElement.style.fontSize = '0.85em';
    warningElement.style.marginTop = '5px';
}

// Функция скрытия предупреждения о недостаточности средств
function hideInsufficientFundsWarning() {
    // Пробуем найти элемент всеми доступными способами
    const warningElement = window.fundsWarningElement || document.getElementById('fundsWarning');
    
    if (warningElement) {
        warningElement.style.display = 'none';
    }
}

// Обработчик кнопки запуска
button.addEventListener('click', async () => {
    if (!isSearching) {
        // Отключаем кнопку на время проверок, чтобы избежать повторных нажатий
        button.disabled = true;
        
        try {
            // Если выбран режим покупки, сначала принудительно проверяем авторизацию
            if (testPurchaseModeCheckbox.checked) {
                // Обновляем статус авторизации непосредственно перед запуском
                console.log('Проверка авторизации перед запуском в режиме покупки...');
                const isAuthValid = await checkActiveTabAuth();
                  // Если пользователь не авторизован но пытается использовать режим покупки
                if (!isAuthValid) {
                    alert('Для использования автоматической покупки необходимо авторизоваться на сайте Столото!');
                    
                    // Отключаем чекбокс режима покупки
                    testPurchaseModeCheckbox.checked = false;
                    purchaseOptionsContainer.style.display = 'none';
                    
                    // Обновляем UI
                    updateAuthDependentUI();
                    button.disabled = false;
                    return;
                }
                
                // Проверяем баланс пользователя, если включен режим покупки
                const ticketsToBuy = parseInt(ticketsToBuyInput.value) || 1;
                const balanceInfo = await checkUserBalance(ticketsToBuy);
                
                if (!balanceInfo.hasEnoughFunds) {
                    // Показываем предупреждение о недостаточности средств
                    showInsufficientFundsWarning(balanceInfo.balance, ticketsToBuy);
                    button.disabled = false;
                    return;
                } else {
                    // Скрываем предупреждение, если оно было
                    hideInsufficientFundsWarning();
                }
            }
            
            // Начинаем поиск
            const numbers = parseNumbers(numbersInput.value);
            const excludeNumbers = parseNumbers(excludeNumbersInput.value);
            const isPurchaseMode = testPurchaseModeCheckbox.checked && isUserAuthenticated;
            const ticketsToBuy = isPurchaseMode ? parseInt(ticketsToBuyInput.value) || 1 : 0;
            
            // Проверка на валидность чисел
            if (numbers.length === 0) {
                alert('Пожалуйста, введите корректные числа от 1 до 90');
                button.disabled = false;
                return;
            }
            
            // Сохраняем параметры поиска
            await saveSearchParams(numbers, excludeNumbers, searchMode.value, isPurchaseMode, ticketsToBuy);
            
            // Получаем активную вкладку
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tabs || tabs.length === 0) {
                alert('Не удалось найти активную вкладку со Столото. Пожалуйста, откройте сайт Столото.');
                button.disabled = false;
                return;
            }
            
            const activeTab = tabs[0];
            
            // Запускаем поиск
            chrome.tabs.sendMessage(activeTab.id, {
                action: 'clickNumbers',
                numbers: numbers,
                excludeNumbers: excludeNumbers,
                mode: searchMode.value,
                isPurchaseMode: isPurchaseMode,
                ticketsToBuy: ticketsToBuy
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Ошибка:', chrome.runtime.lastError);
                    alert('Ошибка: убедитесь, что вы находитесь на странице Столото');
                    button.disabled = false;
                } else if (response && response.status === 'error') {
                    console.error('Ошибка:', response.message);
                    alert(response.message);
                    button.disabled = false;
                } else {
                    console.log('Начат поиск билета');
                    isSearching = true;
                    button.textContent = 'Остановить';
                    button.classList.remove('start');
                    button.classList.add('stop');
                    button.disabled = false;
                }
            });
        } catch (error) {
            console.error('Ошибка при запуске поиска:', error);
            alert('Произошла ошибка при запуске поиска. Пожалуйста, попробуйте еще раз.');
            button.disabled = false;
        }
    } else {
        // Останавливаем поиск
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            button.disabled = true;
            
            chrome.tabs.sendMessage(tab.id, { action: 'stopSearch' }, () => {
                isSearching = false;
                button.textContent = 'Запустить';
                button.classList.remove('stop');
                button.classList.add('start');
                button.disabled = false;
            });
            
            // Установим таймаут на случай, если сообщение не дойдет
            setTimeout(() => {
                if (button.disabled) {
                    button.disabled = false;
                    isSearching = false;
                    button.textContent = 'Запустить';
                    button.classList.remove('stop');
                    button.classList.add('start');
                }
            }, 1000);
        } catch (error) {
            console.error('Ошибка при остановке поиска:', error);
            button.disabled = false;
        }
    }
});

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Инициализация popup...');
    
    // Изначально считаем, что пользователь не авторизован
    isUserAuthenticated = false;
    
    // Запускаем проверку авторизации
    await checkAuthFromStorage();
    
    // Обновляем UI в соответствии со статусом авторизации
    updateAuthDependentUI();
    
    // Загружаем последние параметры поиска
    await loadLastSearchParams();
    
    // Запускаем дополнительные проверки авторизации с интервалами
    // для повышения точности определения статуса пользователя
    setTimeout(async () => {
        await checkActiveTabAuth();
        updateAuthDependentUI();
    }, 500);
    
    // Еще одна финальная проверка через секунду
    setTimeout(async () => {
        await checkActiveTabAuth();
        updateAuthDependentUI();
        
        // Если авторизация стала положительной, снова загрузим настройки режима покупки
        if (isUserAuthenticated) {
            await loadLastSearchParams();
        }
    }, 1000);
});
