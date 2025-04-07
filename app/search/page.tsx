'use client';

import { SearchInput } from '@/components/search/SearchInput';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchPagination } from '@/components/search/SearchPagination';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSearch } from '@/lib/hooks/useSearch';

export default function SearchPage() {
  const {
    query,
    results,
    loading,
    error,
    filters,
    currentPage,
    handleSearch,
    handleFilterChange,
    handlePageChange,
  } = useSearch();

  return (
    <div className="min-h-screen bg-gray-50">
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
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : results ? (
                    <div>
                      <SearchResults 
                        results={results} 
                        query={query} 
                        onPageChange={handlePageChange}
                        currentPage={currentPage}
                      />
                      
                      {/* Pagination Controls */}
                      {results.pagination && (
                        <SearchPagination 
                          pagination={results.pagination} 
                          onPageChange={handlePageChange} 
                        />
                      )}
                    </div>
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