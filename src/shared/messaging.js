/**
 * Типы сообщений между компонентами расширения
 * sidepanel ↔ background ↔ content
 */

export const MESSAGE_TYPES = {
  // Команды от sidepanel к background
  SIDEPANEL_OPENED: 'sidepanel_opened',
  START_SEARCH: 'start_search',
  STOP_SEARCH: 'stop_search',
  CHECK_SEARCH_STATUS: 'check_search_status',
  SCHEDULE_RELOAD: 'schedule_reload',

  // Команды от background к content
  GET_TICKETS: 'get_tickets',
  GET_USER_DATA: 'get_user_data',
  NEXT_PAGE: 'next_page',
  HAS_NEXT_PAGE: 'has_next_page',
  CLICK_TICKET: 'click_ticket',
  OPEN_FILTER_MODAL: 'open_filter_modal',
  SELECT_NUMBERS: 'select_numbers',
  APPLY_FILTER: 'apply_filter',
  CLEAR_FILTER: 'clear_filter',
  CHECK_PAGE_READY: 'check_page_ready',
  RELOAD_PAGE: 'reload_page',
  CHECK_PAYMENT_BUTTONS: 'check_payment_buttons',
  CLICK_PAYMENT_BUTTON: 'click_payment_button',

  // Ответы от content к background
  PAGE_READY: 'PAGE_READY',
  TICKETS_DATA: 'tickets_data',
  PAGE_LOADED: 'page_loaded',

  // Уведомления
  SEARCH_PROGRESS: 'search_progress',
  TICKET_FOUND: 'ticket_found',
  SEARCH_STOPPED: 'search_stopped',
  ERROR: 'error',
  OUR_TAB_CLOSED: 'our_tab_closed',
  AUTH_CHANGED: 'AUTH_CHANGED',
  CLOSE_SIDEPANEL: 'close_sidepanel'
};
