chrome.action.onClicked.addListener(async (tab) => {
    // URL рабочей страницы приложения (обновлено для новой структуры сайта)
    const workPageUrl = 'https://www.stoloto.ru/ruslotto/game?viewType=tickets';
    
    // Если текущая вкладка - рабочая страница приложения
    if (tab.url === workPageUrl) {
        // Открываем popup
        await chrome.action.setPopup({ popup: 'popup.html' });
        // Имитируем повторный клик, чтобы открыть popup
        await chrome.action.openPopup();
    } else {
        // Если текущая вкладка не рабочая, открываем новую
        await chrome.tabs.create({ url: workPageUrl });
    }
    
    // Сбрасываем popup, чтобы следующий клик снова прошёл через этот обработчик
    await chrome.action.setPopup({ popup: '' });
});
