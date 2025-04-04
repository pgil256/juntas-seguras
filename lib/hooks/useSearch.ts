import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchResponse, SearchParams } from '@/types/search';
import { useDebounce } from './useDebounce';

/**
 * Custom hook to handle search functionality
 * Provides search state, methods to perform searches, and handles URL synchronization
 */
export function useSearch(initialParams?: Partial<SearchParams>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Initialize state from URL or initial params
  const [query, setQuery] = useState(
    searchParams.get('q') || initialParams?.query || ''
  );
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page') || '1', 10)
  );
  
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || initialParams?.category || 'all',
    dateFrom: searchParams.get('dateFrom') || initialParams?.filters?.dateFrom || '',
    dateTo: searchParams.get('dateTo') || initialParams?.filters?.dateTo || '',
    status: searchParams.get('status') || initialParams?.filters?.status || 'all',
    sortField: searchParams.get('sortField') || initialParams?.sort?.field || '',
    sortDirection: (searchParams.get('sortDirection') || initialParams?.sort?.direction || 'desc') as 'asc' | 'desc',
  });
  
  // Debounce filters to avoid excessive API calls
  const debouncedFilters = useDebounce(filters, 300);
  
  /**
   * Updates the URL with current search parameters
   */
  const updateSearchUrl = useCallback((searchQuery: string, searchFilters: any, page: number) => {
    const params = new URLSearchParams({
      q: searchQuery,
    });
    
    if (page > 1) {
      params.append('page', page.toString());
    }
    
    if (searchFilters.category && searchFilters.category !== 'all') {
      params.append('category', searchFilters.category);
    }
    
    if (searchFilters.dateFrom) {
      params.append('dateFrom', searchFilters.dateFrom);
    }
    
    if (searchFilters.dateTo) {
      params.append('dateTo', searchFilters.dateTo);
    }
    
    if (searchFilters.status && searchFilters.status !== 'all') {
      params.append('status', searchFilters.status);
    }
    
    if (searchFilters.sortField) {
      params.append('sortField', searchFilters.sortField);
      params.append('sortDirection', searchFilters.sortDirection);
    }
    
    // Update URL without causing a navigation/reload
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [router]);
  
  /**
   * Performs search with the given parameters
   */
  const performSearch = useCallback(async (
    searchQuery: string, 
    searchFilters: any = {}, 
    page: number = 1,
    limit: number = 10
  ) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        q: searchQuery,
        page: page.toString(),
        limit: limit.toString(),
      });
      
      // Add filter parameters
      if (searchFilters.category && searchFilters.category !== 'all') {
        params.append('category', searchFilters.category);
      }
      
      if (searchFilters.dateFrom) {
        params.append('dateFrom', searchFilters.dateFrom);
      }
      
      if (searchFilters.dateTo) {
        params.append('dateTo', searchFilters.dateTo);
      }
      
      if (searchFilters.status && searchFilters.status !== 'all') {
        params.append('status', searchFilters.status);
      }
      
      // Add sort parameters
      if (searchFilters.sortField) {
        params.append('sortField', searchFilters.sortField);
        params.append('sortDirection', searchFilters.sortDirection || 'desc');
      }
      
      // Make API call to search endpoint
      const response = await fetch(`/api/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Search API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data.results);
      
      // Update URL with search parameters
      updateSearchUrl(searchQuery, searchFilters, page);
    } catch (error) {
      console.error('Search error:', error);
      setError('An error occurred while searching. Please try again.');
      
      // Set empty results on error
      setResults({
        pools: [],
        members: [],
        transactions: [],
        messages: [],
        totalResults: 0
      });
    } finally {
      setLoading(false);
    }
  }, [updateSearchUrl]);
  
  /**
   * Handle search submission
   */
  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    setCurrentPage(1); // Reset to page 1 when new search is performed
    performSearch(searchQuery, filters, 1);
  }, [filters, performSearch]);
  
  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, []);
  
  /**
   * Handle page change
   */
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    performSearch(query, filters, newPage);
    
    // Scroll to top of results
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [query, filters, performSearch]);
  
  // Effect to perform search when filters change (debounced)
  useEffect(() => {
    if (query && debouncedFilters) {
      performSearch(query, debouncedFilters, currentPage);
    }
  }, [debouncedFilters, currentPage, query, performSearch]);
  
  // Initial search on page load if there's a query
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
      setCurrentPage(parseInt(searchParams.get('page') || '1', 10));
      performSearch(
        urlQuery, 
        {
          category: searchParams.get('category') || 'all',
          dateFrom: searchParams.get('dateFrom') || '',
          dateTo: searchParams.get('dateTo') || '',
          status: searchParams.get('status') || 'all',
          sortField: searchParams.get('sortField') || '',
          sortDirection: searchParams.get('sortDirection') || 'desc',
        }, 
        parseInt(searchParams.get('page') || '1', 10)
      );
    }
  }, [searchParams, performSearch]);
  
  return {
    query,
    results,
    loading,
    error,
    filters,
    currentPage,
    handleSearch,
    handleFilterChange,
    handlePageChange,
    performSearch,
  };
}