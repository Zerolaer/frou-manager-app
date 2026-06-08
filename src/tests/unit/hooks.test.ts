import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalStorage } from '@/hooks/useLocalStorage';

describe('Custom Hooks', () => {
  describe('useDebounce', () => {
    it('should debounce value changes', () => {
      vi.useFakeTimers();

      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      rerender({ value: 'changed', delay: 500 });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('changed');
      vi.useRealTimers();
    });

    it('should cancel previous timeout on rapid changes', () => {
      vi.useFakeTimers();

      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'first' });
      act(() => {
        vi.advanceTimersByTime(250);
      });

      rerender({ value: 'second' });
      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current).toBe('second');
      vi.useRealTimers();
    });
  });

  describe('useLocalStorage', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should initialize with default value', () => {
      const { result } = renderHook(() =>
        useLocalStorage('test-key', 'default')
      );

      expect(result.current[0]).toBe('default');
    });

    it('should save value to localStorage', () => {
      const { result } = renderHook(() =>
        useLocalStorage('test-key', 'initial')
      );

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
      expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
    });

    it('should load existing value from localStorage', () => {
      localStorage.setItem('existing-key', JSON.stringify('existing'));

      const { result } = renderHook(() =>
        useLocalStorage('existing-key', 'default')
      );

      expect(result.current[0]).toBe('existing');
    });

    it('should handle complex objects', () => {
      const initialValue = { name: 'Test', count: 0 };
      const { result } = renderHook(() =>
        useLocalStorage('object-key', initialValue)
      );

      const newValue = { name: 'Updated', count: 5 };
      act(() => {
        result.current[1](newValue);
      });

      expect(result.current[0]).toEqual(newValue);
    });

    it('should handle localStorage errors gracefully', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() =>
        useLocalStorage('test-key', 'initial')
      );

      // Should not throw
      act(() => {
        result.current[1]('new value');
      });

      spy.mockRestore();
    });
  });
});

