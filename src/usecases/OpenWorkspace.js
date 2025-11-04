/**
 * Use Case: Открыть рабочее пространство
 * Закрывает старые вкладки и открывает новую с sidepanel
 */
export class OpenWorkspace {
  constructor(chromeAdapter, ourTabs) {
    this.chromeAdapter = chromeAdapter;
    this.ourTabs = ourTabs; // Set с ID наших вкладок
  }

  async execute() {
    const targetUrl = 'https://www.stoloto.ru/ruslotto/game?viewType=tickets';
    
    console.log('🚀 OpenWorkspace: начало');
    
    // 1. Проверяем нашу вкладку - если она на другой странице, закрываем
    for (const tabId of this.ourTabs) {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab.url.includes('stoloto.ru/ruslotto/game')) {
          console.log('❌ Наша вкладка на другой странице, закрываем:', tabId);
          await chrome.tabs.remove(tabId);
          this.ourTabs.delete(tabId);
        }
      } catch (e) {
        // Вкладка не существует, удаляем из ourTabs
        this.ourTabs.delete(tabId);
      }
    }
    
    // 2. Найти все вкладки с нужным адресом
    const tabs = await chrome.tabs.query({ url: 'https://www.stoloto.ru/ruslotto/game*' });
    console.log('📋 Найдено вкладок:', tabs.length);
    console.log('📋 Наших вкладок:', this.ourTabs.size);
    
    // 3. Найти нашу вкладку (если есть)
    const ourTab = tabs.find(tab => this.ourTabs.has(tab.id));
    
    if (ourTab) {
      // Есть наша вкладка - активируем её
      console.log('✅ Найдена наша вкладка:', ourTab.id, '- активируем');
      await chrome.tabs.update(ourTab.id, { active: true });
      
      // Закрываем чужие вкладки
      for (const tab of tabs) {
        if (tab.id !== ourTab.id) {
          await chrome.tabs.remove(tab.id);
          console.log('❌ Закрыта чужая вкладка:', tab.id);
        }
      }
      
      return ourTab.id;
    } else {
      // Нет нашей вкладки - закрываем все и создаем новую
      console.log('❌ Нет нашей вкладки - создаем новую');
      
      for (const tab of tabs) {
        await chrome.tabs.remove(tab.id);
        console.log('❌ Закрыта чужая вкладка:', tab.id);
      }
      
      const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
      console.log('✅ Создана новая вкладка:', newTab.id);
      
      return newTab.id;
    }
  }
}
