/**
 * Represents a single search result item
 */
export interface SearchResult {
  id: string;
  type: 'pool' | 'member' | 'transaction' | 'message';
  title: string;
  subtitle?: string;
  matchedFields: string[];
  url: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Structure of the search response from the API
 */
export interface SearchResponse {
  pools: SearchResult[];
  members: SearchResult[];
  transactions: SearchResult[];
  messages: SearchResult[];
  totalResults: number;
  pagination?: PaginationInfo;
}

/**
 * Pagination information for search results
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalItems: number;
  itemsPerPage: number;
}

/**
 * Search request parameters
 */
export interface SearchParams {
  query: string;
  category?: 'all' | 'pools' | 'members' | 'transactions' | 'messages';
  page?: number;
  limit?: number;
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    [key: string]: any;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}