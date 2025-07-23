/**
 * Столото Автокликер - Content Script
 * Точка входа для расширения Chrome
 * Все модули загружаются через manifest.json
 */

// Сообщаем о загрузке скрипта
console.log('Столото Автокликер: content script загружен');

// Функция проверки готовности страницы Столото
function isStolotoPageReady() {
    // Проверяем, что документ полностью загружен
    if (document.readyState !== 'complete') {
        console.log('Страница не готова: document.readyState =', document.readyState);
        return false;
    }
    
    // Проверяем, что это страница Столото
    const isStolotoPage = window.location.hostname.includes('stoloto.ru');
    if (!isStolotoPage) {
        console.log('Это не страница Столото:', window.location.hostname);
        return false;
    }
    
    // Проверяем наличие ключевых элементов страницы
    const hasNumberButtons = document.querySelectorAll('button').length > 0;
    const hasShowTicketsButton = Array.from(document.querySelectorAll('button')).some(btn => 
        btn.textContent.trim() === 'Показать билеты'
    );
    
    // Дополнительная проверка на наличие основных элементов интерфейса
    const hasMainContent = document.querySelector('main, .main-content, #main') !== null;
    const hasBasicStructure = document.body && document.body.children.length > 0;
    
    // Страница готова, если есть кнопки с числами или кнопка "Показать билеты", 
    // а также базовая структура страницы
    const isReady = (hasNumberButtons || hasShowTicketsButton) && hasBasicStructure;
    
    console.log('Проверка готовности страницы:', {
        documentReady: document.readyState === 'complete',
        isStolotoPage,
        hasNumberButtons,
        hasShowTicketsButton,
        hasBasicStructure,
        isReady
    });
    
    return isReady;
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
