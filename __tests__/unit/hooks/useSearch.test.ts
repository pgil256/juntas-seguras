/**
 * Unit tests for lib/hooks/useSearch.ts
 * Tests the search functionality including debouncing and URL synchronization
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSearch } from '@/lib/hooks/useSearch';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

describe('useSearch', () => {
  const mockSearchResponse = {
    results: {
      pools: [
        {
          id: 'pool-1',
          type: 'pool' as const,
          title: 'Test Pool',
          matchedFields: ['name'],
          url: '/pools/pool-1',
        },
      ],
      members: [],
      transactions: [],
      messages: [],
      totalResults: 1,
    },
  };

  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFetch.mockReset();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return initial state with empty query', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.query).toBe('');
      expect(result.current.results).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentPage).toBe(1);
    });

    it('should initialize from URL search params', () => {
      const params = new URLSearchParams({
        q: 'test query',
        page: '2',
        category: 'pools',
        status: 'active',
      });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useSearch());

      expect(result.current.query).toBe('test query');
      expect(result.current.currentPage).toBe(2);
      expect(result.current.filters.category).toBe('pools');
      expect(result.current.filters.status).toBe('active');
    });

    it('should initialize from provided initial params', () => {
      const { result } = renderHook(() =>
        useSearch({
          query: 'initial query',
          category: 'members',
          filters: {
            dateFrom: '2024-01-01',
            dateTo: '2024-12-31',
          },
        })
      );

      expect(result.current.query).toBe('initial query');
      expect(result.current.filters.category).toBe('members');
      expect(result.current.filters.dateFrom).toBe('2024-01-01');
      expect(result.current.filters.dateTo).toBe('2024-12-31');
    });
  });

  describe('Successful API Operations', () => {
    it('should perform search successfully', async () => {
      // Use mockResolvedValue for all fetch calls (hook may call fetch multiple times due to effects)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleSearch('test');
        // Advance timers for debounce
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.results).toEqual(mockSearchResponse.results);
      expect(result.current.query).toBe('test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?q=test')
      );
    });

    it('should not search with empty query', async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleSearch('');
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.results).toBeNull();
    });

    it('should not search with whitespace-only query', async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleSearch('   ');
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.results).toBeNull();
    });

    it('should include filters in search request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleFilterChange({
          category: 'pools',
          status: 'active',
          dateFrom: '2024-01-01',
          dateTo: '2024-06-30',
          sortField: 'name',
          sortDirection: 'asc',
        });
      });

      // Advance timers for debounce
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Set query to trigger search
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      await act(async () => {
        result.current.handleSearch('test');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('category=pools')
      );
    });

    it('should update URL after search', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleSearch('test query');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining('/search?q=test+query'),
        { scroll: false }
      );
    });

    it('should reset to page 1 on new search', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const params = new URLSearchParams({ q: 'old', page: '5' });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleSearch('new query');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('Pagination', () => {
    it('should handle page change', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      // Initial search params with query
      const params = new URLSearchParams({ q: 'test' });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useSearch());

      // Wait for initial fetch triggered by URL query
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Change page
      await act(async () => {
        result.current.handlePageChange(2);
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentPage).toBe(2);
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      });
    });

    it('should include page in API request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const params = new URLSearchParams({ q: 'test' });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockClear();

      await act(async () => {
        result.current.handlePageChange(3);
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('page=3')
        );
      });
    });
  });

  describe('Filter Changes', () => {
    it('should update filters', async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleFilterChange({
          category: 'transactions',
          status: 'pending',
        });
      });

      expect(result.current.filters.category).toBe('transactions');
      expect(result.current.filters.status).toBe('pending');
    });

    it('should reset to page 1 on filter change', async () => {
      const params = new URLSearchParams({ q: 'test', page: '3' });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleFilterChange({
          category: 'messages',
        });
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('should debounce filter changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      // Start with a query in params
      const params = new URLSearchParams({ q: 'test' });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useSearch());

      // Wait for initial search
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockClear();

      // Rapid filter changes
      await act(async () => {
        result.current.handleFilterChange({ category: 'pools' });
      });

      await act(async () => {
        result.current.handleFilterChange({ category: 'members' });
      });

      await act(async () => {
        result.current.handleFilterChange({ category: 'transactions' });
      });

      // Before debounce completes, no extra calls
      expect(mockFetch).not.toHaveBeenCalled();

      // After debounce
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Should only call once with final filter value
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleSearch('test');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('An error occurred while searching. Please try again.');
      expect(result.current.results).toEqual({
        pools: [],
        members: [],
        transactions: [],
        messages: [],
        totalResults: 0,
      });
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleSearch('test');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('An error occurred while searching. Please try again.');
    });

    it('should clear error on successful search', async () => {
      // First search fails
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleSearch('test');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second search succeeds
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      await act(async () => {
        result.current.handleSearch('test2');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Return Value Types', () => {
    it('should expose all expected properties and methods', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current).toHaveProperty('query');
      expect(result.current).toHaveProperty('results');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('filters');
      expect(result.current).toHaveProperty('currentPage');
      expect(result.current).toHaveProperty('handleSearch');
      expect(result.current).toHaveProperty('handleFilterChange');
      expect(result.current).toHaveProperty('handlePageChange');
      expect(result.current).toHaveProperty('performSearch');
      expect(typeof result.current.handleSearch).toBe('function');
      expect(typeof result.current.handleFilterChange).toBe('function');
      expect(typeof result.current.handlePageChange).toBe('function');
      expect(typeof result.current.performSearch).toBe('function');
    });
  });

  describe('URL Synchronization', () => {
    it('should not include page=1 in URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.handleSearch('test');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.not.stringContaining('page=1'),
        expect.any(Object)
      );
    });

    it('should include page>1 in URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const params = new URLSearchParams({ q: 'test' });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.handlePageChange(2);
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });
  });
});
