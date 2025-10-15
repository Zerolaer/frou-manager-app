import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/currency';
import { formatDate, isToday, isSameWeek } from '@/lib/dateUtils';

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', false && 'hidden', true && 'visible');
      expect(result).toContain('base');
      expect(result).toContain('visible');
      expect(result).not.toContain('hidden');
    });

    it('should handle undefined and null', () => {
      const result = cn('base', undefined, null, 'valid');
      expect(result).toContain('base');
      expect(result).toContain('valid');
    });
  });

  describe('formatCurrency', () => {
    it('should format positive numbers', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('should format negative numbers', () => {
      const result = formatCurrency(-1234.56);
      expect(result).toContain('-');
      expect(result).toContain('1');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    it('should format decimals', () => {
      const result = formatCurrency(100.5);
      expect(result).toBeTruthy();
    });
  });

  describe('Date utilities', () => {
    describe('formatDate', () => {
      it('should format dates', () => {
        const date = new Date('2025-10-15');
        const result = formatDate(date);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      });

      it('should handle date strings', () => {
        const result = formatDate('2025-10-15');
        expect(result).toBeTruthy();
      });
    });

    describe('isToday', () => {
      it('should return true for today', () => {
        const today = new Date();
        expect(isToday(today)).toBe(true);
      });

      it('should return false for yesterday', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(isToday(yesterday)).toBe(false);
      });
    });

    describe('isSameWeek', () => {
      it('should return true for same week dates', () => {
        const date1 = new Date('2025-10-15'); // Wednesday
        const date2 = new Date('2025-10-17'); // Friday
        expect(isSameWeek(date1, date2)).toBe(true);
      });

      it('should return false for different weeks', () => {
        const date1 = new Date('2025-10-15');
        const date2 = new Date('2025-10-22');
        expect(isSameWeek(date1, date2)).toBe(false);
      });
    });
  });
});

