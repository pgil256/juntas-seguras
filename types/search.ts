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

/**
 * Date/status filters accepted by the search API.
 */
export interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

/**
 * Flattened, searchable projections built from Pool documents.
 * (Deliberately looser than the strict domain models in types/pool.ts —
 * these are the shapes the search scorer operates on.)
 */
export interface SearchablePool {
  id: string;
  name: string;
  description: string;
  members: number;
  contributionAmount: number;
  frequency: string;
  totalAmount: number;
}

export interface SearchableMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  poolId: string;
  position: number;
  status: string;
}

export interface SearchableTransaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  member: string;
  poolId: string;
  status: string;
}

export interface SearchableMessage {
  id: string;
  author: string;
  content: string;
  date: string;
  poolId: string;
}