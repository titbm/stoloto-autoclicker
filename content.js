/**
 * Столото Автокликер - Content Script
 * Точка входа для расширения Chrome
 * Все модули загружаются через manifest.json
 */

// Сообщаем о загрузке скрипта
console.log('Столото Автокликер: content script загружен');

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
