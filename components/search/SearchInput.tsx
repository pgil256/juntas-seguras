'use client';

import { useState, useCallback, FormEvent, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  initialQuery?: string;
  onSearch?: (query: string) => void;
  className?: string;
  fullWidth?: boolean;
  autoFocus?: boolean;
}

export function SearchInput({
  initialQuery = '',
  onSearch,
  className = '',
  fullWidth = false,
  autoFocus = false,
}: SearchInputProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();
  const pathname = usePathname();

  // Handle search submission
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        if (onSearch) {
          onSearch(query);
        } else {
          // Only navigate if we're not already on the search page
          if (pathname !== '/search') {
            router.push(`/search?q=${encodeURIComponent(query)}`);
          } else {
            // Update URL without navigation if already on search page
            router.replace(`/search?q=${encodeURIComponent(query)}`);
          }
        }
      }
    },
    [query, onSearch, router, pathname]
  );

  // Handle clear search
  const handleClear = useCallback(() => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    }
  }, [onSearch]);

  // Handle debounced search for real-time results
  useEffect(() => {
    if (debouncedQuery && onSearch) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`relative ${className} ${fullWidth ? 'w-full' : 'w-full sm:w-64'}`}
    >
      <Search 
        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" 
      />
      <Input
        type="text"
        placeholder="Search pools, members, transactions..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`pl-10 pr-${query ? '9' : '4'} py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
        autoFocus={autoFocus}
        suppressHydrationWarning
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}