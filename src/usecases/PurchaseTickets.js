/**
 * Use Case: Автоматическая покупка билетов
 * Ищет и покупает указанное количество билетов
 */

import { MESSAGE_TYPES } from '../shared/messaging.js';
import { SearchTickets } from './SearchTickets.js';

export class PurchaseTickets {
  constructor(chromeAdapter, tabId, session, isResuming = false) {
    this.chromeAdapter = chromeAdapter;
    this.tabId = tabId;
    this.session = session;
    this.isResuming = isResuming; // Флаг что это продолжение после перезагрузки
  }

  async sendStatus(status) {
    await this.chromeAdapter.saveLocal('lastSearchStatus', status);
    await this.chromeAdapter.sendMessage(MESSAGE_TYPES.SEARCH_STATUS, {
      status: status
    }).catch(() => {});
  }

  async execute(criteria, totalTicketsToBuy) {
    console.log('🛒 PurchaseTickets.execute начат');
    console.log('📝 Критерии:', criteria);
    console.log('🎫 Нужно купить билетов:', totalTicketsToBuy);
    
    let ticketsPurchased = 0;
    let totalTicketsChecked = 0; // Накопленный счетчик проверенных билетов
    let totalTicketsFound = 0; // Накопленный счетчик найденных билетов
    
    // Пытаемся восстановить состояние покупки (после перезагрузки страницы)
    const savedState = await this.chromeAdapter.getLocal('purchaseState');
    if (savedState && savedState.tabId === this.tabId) {
      ticketsPurchased = savedState.ticketsPurchased || 0;
      totalTicketsChecked = savedState.ticketsChecked || 0;
      totalTicketsFound = savedState.ticketsFound || 0;
      console.log('📦 Восстановлено состояние: куплено', ticketsPurchased, 'из', totalTicketsToBuy, ', проверено', totalTicketsChecked, ', найдено', totalTicketsFound);
    }
    
    // Цикл покупки
    while (this.session.isRunning && ticketsPurchased < totalTicketsToBuy) {
      console.log(`\n🔄 Цикл покупки: куплено ${ticketsPurchased}/${totalTicketsToBuy}`);
      
      // Определяем сколько билетов еще нужно купить
      const ticketsNeeded = totalTicketsToBuy - ticketsPurchased;
      console.log(`🎯 Нужно купить еще ${ticketsNeeded} билетов`);
      
      // Первый цикл - без задержки, последующие - с задержкой 20 сек
      const reloadDelay = ticketsPurchased > 0 ? 20000 : 0;
      
      if (reloadDelay > 0) {
        await this.sendStatus(`⏳ Ожидаем перезагрузку через 20 секунд чтобы найти еще ${ticketsNeeded} билетов...`);
      }
      
      // Используем SearchTickets для поиска
      const searchTickets = new SearchTickets(this.chromeAdapter, this.tabId, this.session);
      const searchResult = await searchTickets.execute(criteria, ticketsNeeded, reloadDelay, totalTicketsChecked);
      
      // Обновляем общий счетчик проверенных билетов
      totalTicketsChecked = searchResult.ticketsChecked;
      
      if (searchResult.stopped) {
        console.log('⏸️ Поиск остановлен пользователем');
        return {
          success: false,
          ticketsPurchased,
          stopped: true,
          ticketsChecked: totalTicketsChecked,
          ticketsFound: totalTicketsFound
        };
      }
      
      if (!searchResult.found) {
        console.log('❌ Билеты не найдены');
        return {
          success: false,
          ticketsPurchased,
          error: 'Билеты не найдены',
          ticketsChecked: totalTicketsChecked,
          ticketsFound: totalTicketsFound
        };
      }
      
      // Найдены билеты - кликнули ровно столько сколько нужно
      const ticketsToTake = searchResult.tickets.length; // Кликнуто
      const ticketsFoundNow = searchResult.totalMatchingTickets || ticketsToTake; // Всего найдено
      totalTicketsFound += ticketsFoundNow; // Накапливаем найденные билеты
      console.log(`✅ Найдено ${ticketsFoundNow} подходящих, кликнуто ${ticketsToTake} (всего найдено: ${totalTicketsFound})`);
      
      // Билеты уже кликнуты в SearchTickets, ждём появления кнопок оплаты
      console.log('⏳ Ждём появления кнопок оплаты...');
      await this.sendStatus('⏳ Ждём появления кнопки оплаты...');
      
      let paymentStatus = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔍 Попытка ${attempts}/${maxAttempts}: проверяем кнопки оплаты...`);
        
        try {
          paymentStatus = await this.chromeAdapter.sendMessageToTab(
            this.tabId,
            MESSAGE_TYPES.CHECK_PAYMENT_BUTTONS,
            {}
          );
          
          console.log(`📊 Результат попытки ${attempts}: walletPaymentAvailable =`, paymentStatus.data.walletPaymentAvailable);
          
          if (paymentStatus.data.walletPaymentAvailable) {
            console.log('✅ Кнопка оплаты найдена!');
            await this.sendStatus('✅ Кнопка оплаты найдена!');
            break;
          }
          
          console.log(`⏳ Кнопка оплаты еще не появилась, ждём 1 секунду...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
          console.error(`❌ Попытка ${attempts}: ошибка при проверке кнопок -`, e.message);
          
          if (e.message.includes('Could not establish connection')) {
            console.error('💥 Content script не отвечает! Прерываем проверку.');
            break;
          }
          
          console.log(`⏳ Ждём 1 секунду перед следующей попыткой...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!paymentStatus || !paymentStatus.data.walletPaymentAvailable) {
        console.log('❌ Кнопка оплаты не найдена после', maxAttempts, 'попыток');
        return {
          success: false,
          ticketsPurchased,
          error: 'Кнопка оплаты не найдена',
          ticketsChecked: searchResult.ticketsChecked
        };
      }
      
      // НЕ помечаем перезагрузку заранее - сделаем это после клика
      // (возможно пометка как-то влияет на content script)
      
      // Проверяем что вкладка всё ещё существует
      console.log('🔍 Проверяем что вкладка существует...');
      try {
        const tab = await chrome.tabs.get(this.tabId);
        console.log('✅ Вкладка существует:', tab.url);
      } catch (error) {
        console.error('❌ Вкладка не существует или закрыта:', error);
        throw new Error(`Вкладка ${this.tabId} не существует`);
      }
      
      // РЕЖИМ ТЕСТИРОВАНИЯ: проверяем переменную окружения
      const testMode = await this.chromeAdapter.getLocal('testMode');
      
      // Открываем панель оплаты (в тестовом режиме тоже)
      console.log('💳 Открываем панель оплаты');
      await this.sendStatus(testMode 
        ? `🧪 ТЕСТОВЫЙ РЕЖИМ: открываем панель оплаты для ${ticketsToTake} билетов` 
        : `💳 Оплачиваем ${ticketsToTake} билетов...`
      );
      
      try {
        await this.chromeAdapter.sendMessageToTab(
          this.tabId,
          MESSAGE_TYPES.CLICK_PAYMENT_BUTTON,
          { testMode: testMode }
        );
        
        if (testMode) {
          console.log('🧪 ТЕСТОВЫЙ РЕЖИМ: панель оплаты открыта, финальный клик НЕ выполнен');
        } else {
          console.log('✅ Клик на кнопку оплаты выполнен');
        }
      } catch (error) {
        console.error('❌ Ошибка при клике на кнопку оплаты:', error);
        // НЕ бросаем исключение - клик мог быть выполнен, просто content script умер
        console.log('⚠️ Игнорируем ошибку - клик скорее всего выполнен');
      }
      
      ticketsPurchased += ticketsToTake;
      console.log(`✅ Куплено билетов: ${ticketsPurchased}/${totalTicketsToBuy}`);
      await this.sendStatus(`✅ Куплено билетов: ${ticketsPurchased}/${totalTicketsToBuy}`);
      
      // Обновляем searchState в background
      await this.chromeAdapter.sendMessage(MESSAGE_TYPES.PURCHASE_PROGRESS, {
        tabId: this.tabId,
        ticketsPurchased: ticketsPurchased,
        ticketsFound: totalTicketsFound
      }).catch(() => {});
      
      // Сохраняем состояние ПОСЛЕ клика
      await this.chromeAdapter.saveLocal('purchaseState', {
        tabId: this.tabId,
        ticketsPurchased,
        totalTicketsToBuy,
        ticketsChecked: totalTicketsChecked,
        ticketsFound: totalTicketsFound,
        criteria,
        timestamp: Date.now()
      });
      
      // Цикл while продолжится автоматически
      // SearchTickets сам подождёт 20 секунд и перезагрузит страницу
    }
    
    // Покупка завершена (все билеты куплены без перезагрузки)
    console.log('🎉 Покупка завершена!');
    await this.sendStatus(`🎉 Покупка завершена! Куплено: ${ticketsPurchased}`);
    await this.chromeAdapter.saveLocal('purchaseState', null); // Очищаем состояние
    
    return {
      success: true,
      ticketsPurchased,
      stopped: false,
      found: true, // Важно! Чтобы background остановил UI
      tickets: [], // Пустой массив, т.к. все билеты куплены
      ticketsChecked: totalTicketsChecked,
      ticketsFound: totalTicketsFound
    };
  }
}
