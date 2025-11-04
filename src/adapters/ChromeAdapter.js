/**
 * Адаптер для работы с Chrome API
 * Изолирует работу с chrome.runtime, chrome.storage, chrome.tabs
 */

export class ChromeAdapter {
  // === Messaging ===
  
  /**
   * Отправить сообщение в runtime
   */
  sendMessage(type, data = {}) {
    return chrome.runtime.sendMessage({ type, data });
  }

  /**
   * Отправить сообщение в конкретную вкладку
   */
  sendMessageToTab(tabId, type, data = {}) {
    return chrome.tabs.sendMessage(tabId, { type, data });
  }

  /**
   * Слушать сообщения
   */
  onMessage(callback) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Вызываем callback и проверяем возвращает ли он Promise
      const result = callback(message, sender, sendResponse);
      
      // Если callback асинхронный - возвращаем true
      if (result instanceof Promise) {
        result.then(sendResponse).catch(error => {
          console.error('Ошибка в onMessage callback:', error);
          sendResponse({ error: error.message });
        });
        return true;
      }
      
      // Если callback синхронный - не возвращаем true
      return false;
    });
  }

  // === Storage ===
  
  /**
   * Сохранить данные в storage.local
   */
  async saveLocal(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }

  /**
   * Получить данные из storage.local
   */
  async getLocal(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  }

  /**
   * Сохранить данные в storage.sync (синхронизируется между устройствами)
   */
  async saveSync(key, value) {
    await chrome.storage.sync.set({ [key]: value });
  }

  /**
   * Получить данные из storage.sync
   */
  async getSync(key) {
    const result = await chrome.storage.sync.get(key);
    return result[key];
  }

  // === Tabs ===
  
  /**
   * Получить активную вкладку
   */
  async getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  /**
   * Получить вкладку по ID
   */
  async getTab(tabId) {
    return await chrome.tabs.get(tabId);
  }
}
