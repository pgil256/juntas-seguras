/**
 * Unit tests for lib/utils.ts
 * Tests utility functions used throughout the application
 */

import {
  cn,
  formatCalendarDate,
  isValidCalendarDateInput,
  normalizeCalendarDateForApi,
  parseCalendarDate,
} from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('should merge multiple class strings', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle empty strings', () => {
      const result = cn('class1', '', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle undefined values', () => {
      const result = cn('class1', undefined, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle null values', () => {
      const result = cn('class1', null, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle boolean false values', () => {
      const result = cn('class1', false && 'class2', 'class3');
      expect(result).toBe('class1 class3');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base active');
    });

    it('should handle object syntax', () => {
      const result = cn('base', { active: true, disabled: false });
      expect(result).toBe('base active');
    });

    it('should resolve Tailwind conflicts correctly', () => {
      // Later classes should override earlier ones
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toBe('py-1 px-4');
    });

    it('should handle array of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should return empty string for no input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle mixed inputs', () => {
      const result = cn(
        'base',
        ['arr1', 'arr2'],
        { conditional: true },
        undefined,
        'final'
      );
      expect(result).toBe('base arr1 arr2 conditional final');
    });
  });

  describe('calendar date helpers', () => {
    it('should parse date-only strings as local calendar dates', () => {
      const date = parseCalendarDate('2026-06-04');

      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(5);
      expect(date?.getDate()).toBe(4);
    });

    it('should normalize date-only strings to a stable API datetime', () => {
      expect(normalizeCalendarDateForApi('2026-06-04')).toBe('2026-06-04T12:00:00.000Z');
    });

    it('should format date-only strings without shifting a day', () => {
      expect(
        formatCalendarDate('2026-06-04', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      ).toBe('Jun 4, 2026');
    });

    it('should reject invalid calendar dates', () => {
      expect(isValidCalendarDateInput('2026-02-30')).toBe(false);
      expect(normalizeCalendarDateForApi('2026-02-30')).toBeUndefined();
    });
  });
});
