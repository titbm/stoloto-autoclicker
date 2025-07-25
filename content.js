/**
 * Столото Автокликер - Content Script
 * Точка входа для расширения Chrome
 * Все модули загружаются через manifest.json
 */

// Сообщаем о загрузке скрипта
console.log('Столото Автокликер: content script загружен');

// Функция проверки готовности страницы Столото
function isStolotoPageReady() {
    const isStolotoPage = window.location.hostname.includes('stoloto.ru');
    
    if (isStolotoPage) {
        // Проверяем наличие кнопки "Выбрать числа" - основной индикатор готовности страницы
        const selectNumbersButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.trim() === 'Выбрать числа'
        );
        
        const isReady = !!selectNumbersButton;
        console.log('Проверка готовности страницы Столото:', {
            hasSelectNumbersButton: isReady,
            documentState: document.readyState
        });
        
        return isReady;
    }
    
    // Для других сайтов проверяем обычным способом
    const documentComplete = document.readyState === 'complete';
    console.log('Не Столото, обычная проверка:', documentComplete);
    return documentComplete;
}

// Инициализация расширения
// Ожидаем полной загрузки всех модулей
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализируем расширение...');
    
    // Проверяем, что все модули загружены
    const requiredModules = ['stolotoState', 'stolotoAuth', 'stolotoUI', 'stolotoUtils', 'stolotoPayment', 'stolotoSearch', 'stolotoMain'];
    const missingModules = requiredModules.filter(module => !window[module]);
    
    if (missingModules.length > 0) {
        console.error('Не загружены модули:', missingModules);
        return;
    }
    
    console.log('Все модули успешно загружены');
    
    // Настраиваем обработчик сообщений
    window.stolotoMain.setupMessageListener();
    
    // Загружаем состояние покупки
    window.stolotoState.loadPurchaseState();
    
    // Сохраняем статус авторизации при загрузке страницы
    window.stolotoState.saveAuthStatus();
});

// Экспорт функции в глобальное пространство для использования в модулях
window.isStolotoPageReady = isStolotoPageReady;

// Если DOM уже загружен, выполняем инициализацию сразу
if (document.readyState === 'loading') {
    // DOM еще загружается, ждем события DOMContentLoaded
} else {
    // DOM уже загружен
    setTimeout(() => {
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
    }, 100);
}
