'use client';

import { useState, useCallback, FormEvent, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, X, Users, CreditCard, Clock, TrendingUp } from 'lucide-react';
import { useDebounce } from '../../lib/hooks/useDebounce';
import { Input } from '../../components/ui/input';

// Recent search storage key
const RECENT_SEARCHES_KEY = 'juntas_recent_searches';
const MAX_RECENT_SEARCHES = 5;

// Quick search suggestions
const quickSuggestions = [
  { label: 'Active pools', query: 'status:active', icon: Users },
  { label: 'Pending payments', query: 'payments:pending', icon: CreditCard },
  { label: 'Recent activity', query: 'sort:recent', icon: Clock },
  { label: 'Top contributors', query: 'sort:contributions', icon: TrendingUp },
];

interface SearchInputProps {
  initialQuery?: string;
  onSearch?: (query: string) => void;
  className?: string;
  fullWidth?: boolean;
  autoFocus?: boolean;
  showSuggestions?: boolean;
}

export function SearchInput({
  initialQuery = '',
  onSearch,
  className = '',
  fullWidth = false,
  autoFocus = false,
  showSuggestions = true,
}: SearchInputProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Save search to recent searches
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    try {
      const searches = [...recentSearches];
      // Remove if already exists
      const existingIndex = searches.indexOf(searchQuery);
      if (existingIndex > -1) {
        searches.splice(existingIndex, 1);
      }
      // Add to beginning
      searches.unshift(searchQuery);
      // Limit to max
      const limited = searches.slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(limited);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(limited));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [recentSearches]);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Handle search submission
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        saveRecentSearch(query.trim());
        setIsFocused(false);
        if (onSearch) {
          onSearch(query);
        } else {
          if (pathname !== '/search') {
            router.push(`/search?q=${encodeURIComponent(query)}`);
          } else {
            router.replace(`/search?q=${encodeURIComponent(query)}`);
          }
        }
      }
    },
    [query, onSearch, router, pathname, saveRecentSearch]
  );

  // Handle suggestion click
  const handleSuggestionClick = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    saveRecentSearch(searchQuery);
    setIsFocused(false);
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }, [onSearch, router, saveRecentSearch]);

  // Handle clear search
  const handleClear = useCallback(() => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    }
    inputRef.current?.focus();
  }, [onSearch]);

  // Handle debounced search for real-time results
  useEffect(() => {
    if (debouncedQuery && onSearch) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = showSuggestions && isFocused && !query.trim();
  const hasRecentSearches = recentSearches.length > 0;

  return (
    <div
      ref={containerRef}
      className={`relative ${className} ${fullWidth ? 'w-full' : 'w-full sm:w-64'}`}
    >
      <form onSubmit={handleSubmit}>
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10"
        />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search pools, members..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="pl-10 pr-9 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus={autoFocus}
          suppressHydrationWarning
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500 z-10"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden animate-slide-down">
          {/* Recent searches */}
          {hasRecentSearches && (
            <div className="py-2">
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent</span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(search)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                >
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700 truncate">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          {hasRecentSearches && (
            <div className="border-t border-gray-100" />
          )}

          {/* Quick suggestions */}
          <div className="py-2">
            <div className="px-3 py-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quick filters</span>
            </div>
            {quickSuggestions.map((suggestion, index) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.query)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                >
                  <Icon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-700">{suggestion.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}