// Этот скрипт выполняется в контексте страницы (world: MAIN)
// Перехватываем XMLHttpRequest для отслеживания login/logout

const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  this._url = url;
  return originalOpen.call(this, method, url, ...rest);
};

XMLHttpRequest.prototype.send = function(...args) {
  this.addEventListener('load', function() {
    const url = this._url;
    if (url && typeof url === 'string' && this.status >= 200 && this.status < 300) {
      if (url.includes('/users/login') || url.includes('/users/logout')) {
        console.log('🔐 Авторизация изменена:', url);
        window.postMessage({ type: 'STOLOTO_AUTH_CHANGED', url }, '*');
      }
    }
  });
  
  return originalSend.apply(this, args);
};
