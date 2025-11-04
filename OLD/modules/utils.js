/**
 * Utils Module - Вспомогательные функции
 * Содержит утилиты общего назначения
 */

// Функция для форматирования времени поиска
function formatSearchTime() {
    if (!window.stolotoState?.searchStartTime) return '';
    const seconds = Math.floor((Date.now() - window.stolotoState.searchStartTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}м ${remainingSeconds}с`;
}

// Экспорт функций в глобальное пространство для совместимости
window.stolotoUtils = {
    formatSearchTime
};
