export class NumberUtils {
  /**
   * Rounds a number to a specified number of decimal places.
   *
   * @param num - The number to be rounded.
   * @param decimalPlaces - The number of decimal places to round to.
   * @returns The rounded number.
   */
  public static numberFixer(num: number, decimalPlaces: number): number {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round((num + Number.EPSILON) * factor) / factor;
  }

  /**
   * Takes two numbers and returns the percentage of the first number in the second number with two decimal places.
   *
   * @param num1 The first number.
   * @param num2 The second number.
   *
   * @returns The percentage of the first number in the second number with two decimal places.
   */
  public static percentage(num1: number, num2: number): number {
    return Number(((num1 / num2) * 100).toFixed(2));
  }

  /**
   * Rounds a number to a string representation with a denomination suffix.
   * @param num - The number to round.
   * @returns The rounded number as a string with a denomination suffix.
   */
  public static roundToDenomination(num: number): string {
    if (num < 10000) {
      return num.toString();
    }

    const suffixes = ['K', 'M', 'B', 'T', 'Q'];
    let index = -1;
    let temp = num;

    while (temp >= 1000 && index < suffixes.length - 1) {
      temp /= 1000;
      index++;
    }

    let result;
    if (temp % 1 === 0) {
      result = temp.toString();
    } else {
      const adjustedTemp = Math.ceil(temp * 10) / 10;
      result = adjustedTemp.toFixed(1);
    }

    if (result.endsWith('.9')) {
      result = Math.ceil(Number(result)).toString();
    }

    if (result.endsWith('.0')) {
      result = result.substring(0, result.length - 2);
    }

    if (result === '1000') {
      index += 1;
      result = '1';
    }

    return result + (index >= 0 ? suffixes[index] : '');
  }

  /**
   * Generates a random numeric code with the specified number of digits.
   *
   * @param digits - The number of digits for the generated code.
   * @returns A random numeric code with the specified number of digits.
   */
  public static generateCode(digits: number): number {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
}
