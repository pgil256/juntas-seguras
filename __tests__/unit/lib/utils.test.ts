/**
 * Unit tests for lib/utils.ts
 * Tests utility functions used throughout the application
 */

import { cn } from '@/lib/utils';

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
});
