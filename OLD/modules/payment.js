/**
 * Payment Module - Работа с оплатой
 * Отвечает за проверку наличия кнопок оплаты и обработку платежей
 */

// Функция для проверки наличия кнопок оплаты
function checkPaymentButtons() {
    const allButtons = Array.from(document.querySelectorAll('button'));
    
    // Ищем кнопки оплаты по их тексту
    const payByWalletButton = allButtons.find(btn => 
        btn.textContent.trim().includes('Оплатить кошельком')
    );
    
    const payByQRButton = allButtons.find(btn => 
        btn.textContent.trim().includes('QR') || 
        btn.textContent.trim().includes('Оплатить по QR')
    );
    
    return {
        walletPaymentAvailable: !!payByWalletButton,
        qrPaymentAvailable: !!payByQRButton
    };
}

// Экспорт функций в глобальное пространство
window.stolotoPayment = {
    checkPaymentButtons
};
