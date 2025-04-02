'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResponse } from '@/types/search';
import { Loader2 } from 'lucide-react';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'all',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    status: searchParams.get('status') || 'all',
  });

  // Function to perform search
  const performSearch = async (searchQuery: string, searchFilters: any = {}) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        q: searchQuery
      });
      
      // Add filter parameters if they exist
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
      
      // Make API call to search endpoint
      const response = await fetch(`/api/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Search API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Search error:', error);
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
  };

  // Handle search submission
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    performSearch(searchQuery, filters);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    performSearch(query, newFilters);
  };

  // Initial search on page load or query param change
  useEffect(() => {
    if (queryParam) {
      setQuery(queryParam);
      performSearch(queryParam, filters);
    }
  }, [queryParam]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900">Search</h1>
          <div className="mt-4">
            <SearchInput 
              initialQuery={query} 
              onSearch={handleSearch} 
              fullWidth 
              autoFocus
            />
          </div>
          
          {query && (
            <div className="mt-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-64">
                  <SearchFilters 
                    onFilterChange={handleFilterChange}
                    initialFilters={filters}
                  />
                </div>
                <div className="flex-1">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : results ? (
                    <SearchResults results={results} query={query} />
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      Enter a search term to get started
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}