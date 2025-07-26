import {generateColorFromNumber, dateUtils} from './helpers.js';

describe('helpers functions', () => {
  describe('generateColorFromNumber', () => {
    test('should return HSL color string', () => {
      const color = generateColorFromNumber(5);
      expect(color).toMatch(/^hsl\(\d+(\.\d+)?, 70%, 60%\)$/);
    });

    test('should return different colors for different numbers', () => {
      const color1 = generateColorFromNumber(1);
      const color2 = generateColorFromNumber(2);
      expect(color1).not.toBe(color2);
    });
  });

  describe('dateUtils.getYYYMMDD', () => {
    test('should return date in YYYY-MM-DD format', () => {
      const testDate = new Date('2025-07-26');
      const result = dateUtils.getYYYMMDD(testDate);
      expect(result).toBe('2025-07-26');
    });

    test('should use current date when no parameter provided', () => {
      const result = dateUtils.getYYYMMDD();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('dateUtils.addDayToDate', () => {
    test('should add days to date correctly', () => {
      const baseDate = new Date('2025-07-26');
      const result = dateUtils.addDayToDate(baseDate, 2);
      expect(result.getDate()).toBe(28);
    });
  });
});
