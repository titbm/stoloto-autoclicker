/**
 * DOM Adapter - Изоляция всей работы с DOM
 * Когда Столото поменяет верстку - правим только этот файл
 */

window.StolotoDOMAdapter = class {
    
    /**
     * Извлекает все билеты со страницы
     * @returns {Array} Массив объектов { id, numbers }
     */
    extractTickets() {
        const ticketButtons = Array.from(document.querySelectorAll('button'))
            .filter(btn => btn.textContent.includes('Билет №'));
        
        return ticketButtons.map(btn => {
            const ticketNumber = btn.textContent.match(/Билет №(\d+)/)?.[1];
            const numbers = this._extractNumbersFromTicket(btn);
            
            return {
                id: ticketNumber,
                numbers: numbers,
                element: btn
            };
        });
    }
    
    /**
     * Извлекает числа из элемента билета
     * @private
     */
    _extractNumbersFromTicket(ticketElement) {
        const numberElements = Array.from(ticketElement.querySelectorAll('*'))
            .filter(el => {
                const text = el.textContent?.trim();
                if (!text) return false;
                const num = parseInt(text);
                return !isNaN(num) && num >= 1 && num <= 90 && text === num.toString();
            });
        
        return numberElements
            .map(el => parseInt(el.textContent.trim()))
            .slice(0, 30);
    }
    
    /**
     * Кликает по билету
     */
    clickTicket(ticketId) {
        const btn = Array.from(document.querySelectorAll('button'))
            .find(btn => btn.textContent.includes(`Билет №${ticketId}`));
        
        if (btn) {
            console.log(`🖱️ Кликаем по билету ${ticketId}`);
            btn.click();
            return true;
        }
        return false;
    }
    
    /**
     * Кликает по кнопке с заданным текстом
     */
    clickButton(buttonText) {
        const btn = Array.from(document.querySelectorAll('button'))
            .find(btn => btn.textContent.trim() === buttonText);
        
        if (btn) {
            console.log(`🖱️ Кликаем по кнопке "${buttonText}"`);
            btn.click();
            return true;
        }
        console.log(`❌ Кнопка "${buttonText}" не найдена`);
        return false;
    }
    
    /**
     * Открывает модальное окно выбора чисел
     */
    async openNumberModal() {
        const opened = this.clickButton('Выбрать числа');
        if (opened) {
            await this._wait(2000);
            return await this._waitForNumberButtons();
        }
        return false;
    }
    
    /**
     * Ждет появления кнопок с числами в модальном окне
     * @private
     */
    _waitForNumberButtons() {
        return new Promise((resolve) => {
            const checkButtons = () => {
                const numberButtons = document.querySelectorAll('dialog button, [data-test-id="number-list"] button');
                const hasNumberButtons = Array.from(numberButtons).some(btn => /^\d+$/.test(btn.textContent.trim()));
                
                if (hasNumberButtons) {
                    console.log(`✅ Найдено ${numberButtons.length} кнопок в модальном окне`);
                    resolve(true);
                } else {
                    setTimeout(checkButtons, 500);
                }
            };
            checkButtons();
        });
    }
    
    /**
     * Выбирает числа в модальном окне
     */
    async selectNumbers(numbers) {
        console.log(`Выбираем числа:`, numbers);
        
        await this._wait(1000);
        
        for (const num of numbers) {
            const numberButtons = Array.from(
                document.querySelectorAll('dialog button, [data-test-id="number-list"] button')
            );
            
            const btn = numberButtons.find(b => 
                b.textContent.trim() === num.toString() && /^\d+$/.test(b.textContent.trim())
            );
            
            if (btn) {
                console.log(`✓ Выбираем число ${num}`);
                btn.click();
                await this._wait(800);
            } else {
                console.log(`✗ Число ${num} не найдено`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Нажимает "Показать билеты"
     */
    async showTickets() {
        await this._wait(1000);
        const clicked = this.clickButton('Показать билеты');
        if (clicked) {
            await this._wait(2000);
        }
        return clicked;
    }
    
    /**
     * Очищает выбор
     */
    async clearSelection() {
        const cleared = this.clickButton('Сбросить');
        if (cleared) {
            await this._wait(500);
        }
        return cleared;
    }
    
    /**
     * Проверяет наличие кнопки "Другие билеты"
     */
    hasNextPageButton() {
        return Array.from(document.querySelectorAll('button'))
            .some(btn => btn.textContent.trim() === 'Другие билеты');
    }
    
    /**
     * Кликает "Другие билеты"
     */
    async loadNextPage() {
        const clicked = this.clickButton('Другие билеты');
        if (clicked) {
            await this._wait(1500);
        }
        return clicked;
    }
    
    /**
     * Проверяет наличие кнопки оплаты
     */
    hasPaymentButton() {
        return Array.from(document.querySelectorAll('button'))
            .some(btn => btn.textContent.includes('Оплатить кошельком'));
    }
    
    /**
     * Кликает по кнопке оплаты
     */
    async clickPayment() {
        const clicked = this.clickButton('Оплатить кошельком');
        if (clicked) {
            await this._wait(5000); // Ждем обработки оплаты
        }
        return clicked;
    }
    
    /**
     * Проверяет авторизацию пользователя
     */
    isUserLoggedIn() {
        // Ищем элементы профиля
        const profileMenu = document.querySelector('[data-test-id="profile-menu"], .profile-menu, .user-profile');
        const userAvatar = document.querySelector('.user-avatar, .account-avatar, [data-test-id="user-avatar"]');
        
        // Ищем кнопку "Вход" (если есть - не авторизован)
        const loginButton = Array.from(document.querySelectorAll('button, a'))
            .find(el => el.textContent.toLowerCase().includes('вход'));
        
        const isLoggedIn = (profileMenu || userAvatar) && !loginButton;
        console.log('Проверка авторизации:', { profileMenu: !!profileMenu, userAvatar: !!userAvatar, loginButton: !!loginButton, isLoggedIn });
        
        return isLoggedIn;
    }
    
    /**
     * Получает баланс пользователя
     */
    getUserBalance() {
        // Ищем элемент с балансом
        const balanceElements = Array.from(document.querySelectorAll('*'))
            .filter(el => {
                const text = el.textContent;
                return text && (text.includes('₽') || text.includes('руб'));
            });
        
        for (const el of balanceElements) {
            const match = el.textContent.match(/(\d+(?:\s?\d+)*)\s*(?:₽|руб)/);
            if (match) {
                const balance = parseInt(match[1].replace(/\s/g, ''));
                if (!isNaN(balance) && balance >= 0 && balance < 1000000) {
                    console.log('Найден баланс:', balance);
                    return balance;
                }
            }
        }
        
        console.log('Баланс не найден');
        return 0;
    }
    
    /**
     * Вспомогательная функция ожидания
     * @private
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

console.log('✅ DOM Adapter загружен');
