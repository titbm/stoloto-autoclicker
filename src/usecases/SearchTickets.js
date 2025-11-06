/**
 * Use Case: Поиск билетов по критериям
 * Оркестрирует процесс поиска билетов на сайте Столото
 */

import { MESSAGE_TYPES } from '../shared/messaging.js';
import { Ticket } from '../domain/Ticket.js';

export class SearchTickets {
  constructor(chromeAdapter, tabId, session) {
    this.chromeAdapter = chromeAdapter;
    this.tabId = tabId;
    this.session = session;
  }

  async sendStatus(status) {
    await this.chromeAdapter.saveLocal('lastSearchStatus', status);
    await this.chromeAdapter.sendMessage(MESSAGE_TYPES.SEARCH_STATUS, {
      status: status
    }).catch(() => {});
  }

  async execute(criteria, maxTickets = null, reloadDelay = 0, initialTicketsChecked = 0) {
    console.log('🎯 SearchTickets.execute начат');
    console.log('📝 Критерии:', criteria);
    console.log('📋 TabId:', this.tabId);
    if (maxTickets) {
      console.log(`🎯 Лимит билетов для клика: ${maxTickets}`);
    }
    if (reloadDelay > 0) {
      console.log(`⏱️ Задержка перед перезагрузкой: ${reloadDelay}ms`);
    }
    
    this.ticketsChecked = initialTicketsChecked; // Начинаем с переданного значения
    this.maxTickets = maxTickets;
    
    // Ждём перед перезагрузкой если указана задержка
    if (reloadDelay > 0) {
      console.log(`⏳ Ждём ${reloadDelay}ms перед перезагрузкой...`);
      await new Promise(resolve => setTimeout(resolve, reloadDelay));
      
      // Проверяем не остановлен ли поиск во время ожидания
      if (!this.session.isRunning) {
        console.log('⏸️ Поиск остановлен во время ожидания перезагрузки');
        return {
          found: false,
          stopped: true,
          tickets: [],
          ticketsChecked: this.ticketsChecked
        };
      }
    }
    
    // Перезагружаем страницу в начале поиска
    console.log('🔄 Перезагружаем страницу перед началом поиска');
    await this.sendStatus('🔄 Перезагружаем страницу...');
    
    await this.chromeAdapter.sendMessageToTab(
      this.tabId,
      MESSAGE_TYPES.RELOAD_PAGE,
      {}
    ).catch(() => {});
    
    // Ждем пока страница загрузится
    console.log('⏳ Ждем загрузки страницы...');
    await this.sendStatus('⏳ Ждем загрузки страницы...');
    
    await new Promise(resolve => {
      const checkLoaded = async () => {
        try {
          const response = await this.chromeAdapter.sendMessageToTab(
            this.tabId,
            MESSAGE_TYPES.CHECK_PAGE_LOADED,
            {}
          );
          if (response?.data?.loaded) {
            console.log('✅ Страница загружена');
            resolve();
          } else {
            setTimeout(checkLoaded, 500);
          }
        } catch (e) {
          setTimeout(checkLoaded, 500);
        }
      };
      setTimeout(checkLoaded, 2000);
    });
    
    // Открыть модальное окно фильтра
    console.log('🔍 Открываем модальное окно фильтра');
    await this.sendStatus('🔍 Открываем фильтр...');
    
    const modalResponse = await this.chromeAdapter.sendMessageToTab(
      this.tabId,
      MESSAGE_TYPES.OPEN_FILTER_MODAL,
      {}
    );
    console.log('📥 Ответ от OPEN_FILTER_MODAL:', modalResponse);
    
    // Выбрать числа в фильтре (максимум 7)
    const numbersForFilter = criteria.searchNumbers.slice(0, 7);
    console.log('🔍 Выбираем числа для фильтра (макс 7):', numbersForFilter);
    await this.sendStatus(`🔢 Вводим числа: ${numbersForFilter.join(', ')}...`);
    
    if (criteria.searchNumbers.length > 7) {
      console.log('📝 Полный список для проверки билетов:', criteria.searchNumbers);
    }
    
    const selectResponse = await this.chromeAdapter.sendMessageToTab(
      this.tabId,
      MESSAGE_TYPES.SELECT_NUMBERS,
      { numbers: numbersForFilter }
    );
    console.log('📥 Ответ от SELECT_NUMBERS:', selectResponse);
    
    // Применить фильтр
    console.log('🔍 Применяем фильтр');
    await this.sendStatus('🔍 Применяем фильтр...');
    
    const applyResponse = await this.chromeAdapter.sendMessageToTab(
      this.tabId,
      MESSAGE_TYPES.APPLY_FILTER,
      {}
    );
    console.log('📥 Ответ от APPLY_FILTER:', applyResponse);
    
    // Начинаем поиск
    await this.sendStatus('🔍 Ищем подходящие билеты. Проверено: 0');
    
    // Ищем подходящие билеты
    console.log('🔄 Начинаем цикл поиска билетов');
    let pageNumber = 1;
    
    while (this.session.isRunning) {
      console.log(`📄 Обрабатываем страницу ${pageNumber}`);
      
      const response = await this.chromeAdapter.sendMessageToTab(
        this.tabId,
        MESSAGE_TYPES.GET_TICKETS,
        {}
      );
      
      console.log('📥 Получен ответ GET_TICKETS:', response);
      
      if (!response.success) {
        const error = new Error(response.error);
        error.ticketsChecked = this.ticketsChecked;
        throw error;
      }
      
      const ticketsData = response.data;
      console.log(`📊 Получено билетов: ${ticketsData.length}`);
      
      const tickets = ticketsData.map(t => new Ticket(t.ticketId, t.numbers));
      
      const matchingTickets = [];
      for (const ticket of tickets) {
        this.ticketsChecked++; // Считаем каждый проверенный билет
        
        // Отправляем прогресс сразу после проверки каждого билета
        await this.chromeAdapter.sendMessage(MESSAGE_TYPES.SEARCH_PROGRESS, {
          checked: this.ticketsChecked
        }).catch(() => {});
        
        if (this.matchesCriteria(ticket, criteria)) {
          matchingTickets.push(ticket);
        }
      }
      
      if (matchingTickets.length > 0) {
        console.log('✅ Найдено подходящих билетов:', matchingTickets.length);
        
        const ticketsToClick = this.maxTickets 
          ? matchingTickets.slice(0, this.maxTickets)
          : matchingTickets;
        
        console.log(`🖱️ Кликаем на ${ticketsToClick.length} из ${matchingTickets.length} найденных`);
        
        // Показываем что нашли билеты
        const ticketWord = ticketsToClick.length === 1 ? 'билет' : 
                          ticketsToClick.length < 5 ? 'билета' : 'билетов';
        await this.sendStatus(`✅ Нашел ${ticketsToClick.length} ${ticketWord}`);
        
        // Кликаем по билетам
        for (let i = 0; i < ticketsToClick.length; i++) {
          const ticket = ticketsToClick[i];
          if (!this.session.isRunning) break;
          
          const current = i + 1;
          
          await this.sendStatus(`✅ Нашел ${ticketsToClick.length} ${ticketWord}. Добавляю ${current} билет...`);
          
          await this.chromeAdapter.sendMessageToTab(
            this.tabId,
            MESSAGE_TYPES.CLICK_TICKET,
            { ticketId: ticket.ticketId }
          );
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Если это покупка (maxTickets > 0) - ждем панель оплаты
        if (this.maxTickets && this.maxTickets > 0) {
          console.log('⏳ Ждём появления панели оплаты...');
          await this.sendStatus('⏳ Ждём появления панели оплаты...');
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // Обычный поиск - завершаем сразу
          await this.sendStatus(`✅ Поиск окончен. Найдено билетов: ${ticketsToClick.length}`);
        }
        
        return { 
          found: true, 
          tickets: ticketsToClick, 
          totalMatchingTickets: matchingTickets.length, // Всего найдено подходящих
          stopped: false, 
          ticketsChecked: this.ticketsChecked 
        };
      }
      
      console.log('❌ Подходящих билетов на этой странице не найдено');
      
      if (!this.session.isRunning) {
        console.log('⏸️ Поиск остановлен пользователем');
        return { found: false, tickets: [], stopped: true, ticketsChecked: this.ticketsChecked };
      }
      
      console.log('🔍 Проверяем наличие следующей страницы...');
      const hasNextResponse = await this.chromeAdapter.sendMessageToTab(
        this.tabId,
        MESSAGE_TYPES.HAS_NEXT_PAGE,
        {}
      );
      
      console.log('📥 Ответ HAS_NEXT_PAGE:', hasNextResponse);
      
      if (!hasNextResponse.data.hasNext) {
        console.log('❌ Следующей страницы нет');
        const error = new Error('Билеты не найдены');
        error.ticketsChecked = this.ticketsChecked;
        throw error;
      }
      
      console.log('➡️ Переходим на следующую страницу...');
      await this.chromeAdapter.sendMessageToTab(
        this.tabId,
        MESSAGE_TYPES.NEXT_PAGE,
        {}
      );
      
      await this.chromeAdapter.sendMessage(MESSAGE_TYPES.SEARCH_PROGRESS, {
        checked: this.ticketsChecked
      }).catch(() => {});
      
      pageNumber++;
    }
    
    console.log('⏸️ Поиск остановлен пользователем');
    return { found: false, tickets: [], stopped: true, ticketsChecked: this.ticketsChecked };
  }

  matchesCriteria(ticket, criteria) {
    const hasExcluded = criteria.excludeNumbers.some(num => 
      ticket.numbers.includes(num)
    );
    if (hasExcluded) return false;

    switch (criteria.mode) {
      case 'anywhere': 
        return ticket.hasAllNumbersAnywhere(criteria.searchNumbers);
      case 'same_row': 
        return ticket.hasAllNumbersInSameRow(criteria.searchNumbers);
      case 'same_half': 
        return ticket.hasAllNumbersInSameHalf(criteria.searchNumbers);
      default:
        throw new Error(`Неизвестный режим поиска: ${criteria.mode}`);
    }
  }
}
