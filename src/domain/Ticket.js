/**
 * Сущность Билет (Ticket)
 * Представляет билет Русского лото с 30 числами от 1 до 90
 */
export class Ticket {
  constructor(ticketId, numbers) {
    this.ticketId = ticketId;
    this.numbers = numbers; // 30 чисел
  }

  // Проверить, есть ли все искомые числа где угодно в билете
  hasAllNumbersAnywhere(searchNumbers) {
    return searchNumbers.every(num => this.numbers.includes(num));
  }

  // Проверить, есть ли все искомые числа в одной строке (6 строк по 5 чисел)
  hasAllNumbersInSameRow(searchNumbers) {
    for (let i = 0; i < 6; i++) {
      const start = i * 5;
      const row = this.numbers.slice(start, start + 5);
      if (searchNumbers.every(num => row.includes(num))) {
        return true;
      }
    }
    return false;
  }

  // Проверить, есть ли все искомые числа в одной половине (верхней или нижней)
  hasAllNumbersInSameHalf(searchNumbers) {
    const upperHalf = this.numbers.slice(0, 15);
    const lowerHalf = this.numbers.slice(15, 30);
    
    const inUpperHalf = searchNumbers.every(num => upperHalf.includes(num));
    const inLowerHalf = searchNumbers.every(num => lowerHalf.includes(num));
    
    return inUpperHalf || inLowerHalf;
  }
}
