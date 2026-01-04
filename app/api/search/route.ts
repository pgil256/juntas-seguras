import { NextRequest, NextResponse } from 'next/server';
import { SearchResponse, PaginationInfo, SearchResult } from '../../../types/search';
import { handleApiRequest } from '../../../lib/api';
import connectToDatabase from '../../../lib/db/connect';
import getPoolModel from '../../../lib/db/models/pool';
import { getUserModel } from '../../../lib/db/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PoolMemberDB {
  id: number;
  name: string;
  email: string;
  phone?: string;
  position: number;
  status: string;
}

interface PoolTransactionDB {
  id: number;
  type: string;
  amount: number;
  date: string;
  member: string;
  status: string;
}

interface PoolMessageDB {
  id: number;
  author: string;
  content: string;
  date: string;
}

/**
 * Create a paginated subset of search results
 */
function paginateResults<T>(items: T[], page: number, limit: number): {
  paginatedItems: T[],
  pagination: PaginationInfo
} {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedItems = items.slice(startIndex, endIndex);
  
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / limit);
  
  const pagination: PaginationInfo = {
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    totalItems,
    itemsPerPage: limit,
  };
  
  return { paginatedItems, pagination };
}

/**
 * Sort search results based on field and direction
 */
function sortResults<T extends Record<string, any>>(items: T[], field: string, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...items].sort((a, b) => {
    if (a[field] === undefined || b[field] === undefined) return 0;
    
    // Handle string comparison
    if (typeof a[field] === 'string' && typeof b[field] === 'string') {
      return direction === 'asc' 
        ? a[field].localeCompare(b[field])
        : b[field].localeCompare(a[field]);
    }
    
    // Handle number comparison
    if (typeof a[field] === 'number' && typeof b[field] === 'number') {
      return direction === 'asc'
        ? a[field] - b[field]
        : b[field] - a[field];
    }
    
    // Handle date comparison
    if (a[field] instanceof Date && b[field] instanceof Date) {
      return direction === 'asc'
        ? a[field].getTime() - b[field].getTime()
        : b[field].getTime() - a[field].getTime();
    }
    
    return 0;
  });
}

/**
 * Calculate relevance score for search results
 * Matches in title are weighted higher than matches in other fields
 */
function calculateRelevance(item: any, query: string, fields: string[]): number {
  const normalizedQuery = query.toLowerCase();
  let score = 0;
  
  fields.forEach(field => {
    const value = item[field]?.toString().toLowerCase() || '';
    
    // Exact match boosts score significantly
    if (value === normalizedQuery) {
      score += field === 'title' ? 10 : 5;
    }
    // Contains match adds to score
    else if (value.includes(normalizedQuery)) {
      score += field === 'title' ? 5 : 2;
    }
    // Word boundary match
    else if (value.split(/\s+/).some((word: string) => word === normalizedQuery)) {
      score += field === 'title' ? 3 : 1;
    }
  });
  
  return score;
}

// Perform the search using database data
function performSearch(
  query: string, 
  category: string = 'all', 
  filters: any = {}, 
  page: number = 1, 
  limit: number = 10,
  sort?: { field: string, direction: 'asc' | 'desc' },
  poolsData: any[] = [],
  membersData: any[] = [],
  transactionsData: any[] = [],
  messagesData: any[] = []
) {
  // Normalize the search query
  const normalizedQuery = query.toLowerCase();
  
  // Search results containers
  let poolResults: SearchResult[] = [];
  let memberResults: SearchResult[] = [];
  let transactionResults: SearchResult[] = [];
  let messageResults: SearchResult[] = [];
  
  // Only search if we have a query
  if (normalizedQuery) {
    // Search pools if category is 'all' or 'pools'
    if (category === 'all' || category === 'pools') {
      poolResults = poolsData
        .filter(pool => 
          pool.name.toLowerCase().includes(normalizedQuery) ||
          pool.description.toLowerCase().includes(normalizedQuery) ||
          pool.frequency.toLowerCase().includes(normalizedQuery)
        )
        .map(pool => {
          const relevance = calculateRelevance(pool, normalizedQuery, ['name', 'description', 'frequency']);
          
          return {
            id: pool.id,
            type: 'pool' as const,
            title: pool.name,
            subtitle: `${pool.members} members • ${pool.contributionAmount} ${pool.frequency.toLowerCase()}`,
            matchedFields: ['name', 'description', 'frequency'].filter(field =>
              pool[field as keyof typeof pool]?.toString().toLowerCase().includes(normalizedQuery)
            ),
            url: `/pools/${pool.id}`,
            metadata: { relevance },
          };
        });
      
      // Sort by relevance by default
      poolResults.sort((a, b) => 
        (b.metadata?.relevance || 0) - (a.metadata?.relevance || 0)
      );
    }
    
    // Search members if category is 'all' or 'members'
    if (category === 'all' || category === 'members') {
      memberResults = membersData
        .filter(member => 
          member.name.toLowerCase().includes(normalizedQuery) ||
          member.email.toLowerCase().includes(normalizedQuery) ||
          (member.phone && member.phone.includes(normalizedQuery))
        )
        .map(member => {
          const relevance = calculateRelevance(member, normalizedQuery, ['name', 'email', 'phone']);
          
          return {
            id: member.id,
            type: 'member' as const,
            title: member.name,
            subtitle: member.email,
            matchedFields: ['name', 'email', 'phone'].filter(field =>
              member[field as keyof typeof member]?.toString().toLowerCase().includes(normalizedQuery)
            ),
            url: `/member-management/${member.poolId}`,
            metadata: { 
              relevance,
              status: member.status,
              poolId: member.poolId 
            },
          };
        });
      
      // Sort by relevance by default
      memberResults.sort((a, b) => 
        (b.metadata?.relevance || 0) - (a.metadata?.relevance || 0)
      );
    }
    
    // Search transactions if category is 'all' or 'transactions'
    if (category === 'all' || category === 'transactions') {
      transactionResults = transactionsData
        .filter(transaction => 
          transaction.type.toLowerCase().includes(normalizedQuery) ||
          transaction.member.toLowerCase().includes(normalizedQuery) ||
          transaction.amount.toString().includes(normalizedQuery) ||
          transaction.status.toLowerCase().includes(normalizedQuery)
        )
        .map(transaction => {
          const relevance = calculateRelevance(
            transaction, 
            normalizedQuery, 
            ['type', 'member', 'amount', 'status']
          );
          
          return {
            id: transaction.id,
            type: 'transaction' as const,
            title: `${transaction.type === 'contribution' ? 'Payment' : 'Payout'} $${transaction.amount}`,
            subtitle: `By ${transaction.member} • ${new Date(transaction.date).toLocaleDateString()}`,
            matchedFields: ['type', 'member', 'amount', 'status'].filter(field =>
              transaction[field as keyof typeof transaction]?.toString().toLowerCase().includes(normalizedQuery)
            ),
            url: `/payments`,
            metadata: { 
              relevance,
              date: transaction.date,
              status: transaction.status,
              poolId: transaction.poolId 
            },
          };
        });
      
      // Sort by date (most recent first) by default
      transactionResults.sort((a, b) => 
        new Date(b.metadata?.date || 0).getTime() - new Date(a.metadata?.date || 0).getTime()
      );
    }
    
    // Search messages if category is 'all' or 'messages'
    if (category === 'all' || category === 'messages') {
      messageResults = messagesData
        .filter(message => 
          message.content.toLowerCase().includes(normalizedQuery) ||
          message.author.toLowerCase().includes(normalizedQuery)
        )
        .map(message => {
          const relevance = calculateRelevance(
            message, 
            normalizedQuery, 
            ['content', 'author']
          );
          
          return {
            id: message.id,
            type: 'message' as const,
            title: message.content.length > 60 ? message.content.substring(0, 60) + '...' : message.content,
            subtitle: `From ${message.author} • ${new Date(message.date).toLocaleDateString()}`,
            matchedFields: ['content', 'author'].filter(field =>
              message[field as keyof typeof message]?.toString().toLowerCase().includes(normalizedQuery)
            ),
            url: `/pools/${message.poolId}`,
            metadata: { 
              relevance,
              date: message.date,
              poolId: message.poolId 
            },
          };
        });
      
      // Sort by date (most recent first) by default
      messageResults.sort((a, b) => 
        new Date(b.metadata?.date || 0).getTime() - new Date(a.metadata?.date || 0).getTime()
      );
    }
  }

  // Apply date filters if provided
  if (filters.dateFrom || filters.dateTo) {
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom).getTime() : 0;
    const dateTo = filters.dateTo ? new Date(filters.dateTo).getTime() : Infinity;
    
    // Filter transactions by date
    transactionResults = transactionResults.filter(result => {
      const txnDate = new Date(result.metadata?.date || '').getTime();
      return txnDate >= dateFrom && txnDate <= dateTo;
    });
    
    // Filter messages by date
    messageResults = messageResults.filter(result => {
      const msgDate = new Date(result.metadata?.date || '').getTime();
      return msgDate >= dateFrom && msgDate <= dateTo;
    });
  }
  
  // Apply status filter if provided and not 'all'
  if (filters.status && filters.status !== 'all') {
    // Filter members by status
    memberResults = memberResults.filter(result => {
      return result.metadata?.status === filters.status;
    });
    
    // Filter transactions by status
    transactionResults = transactionResults.filter(result => {
      return result.metadata?.status === filters.status;
    });
  }
  
  // Apply custom sorting if provided
  if (sort?.field && sort?.direction) {
    if (category === 'pools' || category === 'all') {
      poolResults = sortResults(poolResults, `metadata.${sort.field}`, sort.direction);
    }
    if (category === 'members' || category === 'all') {
      memberResults = sortResults(memberResults, `metadata.${sort.field}`, sort.direction);
    }
    if (category === 'transactions' || category === 'all') {
      transactionResults = sortResults(transactionResults, `metadata.${sort.field}`, sort.direction);
    }
    if (category === 'messages' || category === 'all') {
      messageResults = sortResults(messageResults, `metadata.${sort.field}`, sort.direction);
    }
  }
  
  // Get results based on category for pagination
  let resultsForPagination: SearchResult[] = [];
  
  if (category === 'pools') {
    resultsForPagination = poolResults;
  } else if (category === 'members') {
    resultsForPagination = memberResults;
  } else if (category === 'transactions') {
    resultsForPagination = transactionResults;
  } else if (category === 'messages') {
    resultsForPagination = messageResults;
  } else {
    // For 'all' category, combine all results
    resultsForPagination = [
      ...poolResults,
      ...memberResults, 
      ...transactionResults,
      ...messageResults
    ];
  }
  
  // Apply pagination to the selected category's results
  const { paginatedItems, pagination } = paginateResults(resultsForPagination, page, limit);
  
  // For 'all' category, we need to split the paginated items back into their categories
  let paginatedPools: SearchResult[] = [];
  let paginatedMembers: SearchResult[] = [];
  let paginatedTransactions: SearchResult[] = [];
  let paginatedMessages: SearchResult[] = [];
  
  if (category === 'all') {
    paginatedPools = paginatedItems.filter(item => item.type === 'pool');
    paginatedMembers = paginatedItems.filter(item => item.type === 'member');
    paginatedTransactions = paginatedItems.filter(item => item.type === 'transaction');
    paginatedMessages = paginatedItems.filter(item => item.type === 'message');
  } else if (category === 'pools') {
    paginatedPools = paginatedItems;
  } else if (category === 'members') {
    paginatedMembers = paginatedItems;
  } else if (category === 'transactions') {
    paginatedTransactions = paginatedItems;
  } else if (category === 'messages') {
    paginatedMessages = paginatedItems;
  }
  
  // Construct and return the search response
  const searchResponse: SearchResponse = {
    pools: category === 'all' ? paginatedPools : (category === 'pools' ? paginatedItems : []),
    members: category === 'all' ? paginatedMembers : (category === 'members' ? paginatedItems : []),
    transactions: category === 'all' ? paginatedTransactions : (category === 'transactions' ? paginatedItems : []),
    messages: category === 'all' ? paginatedMessages : (category === 'messages' ? paginatedItems : []),
    totalResults: poolResults.length + memberResults.length + transactionResults.length + messageResults.length,
    pagination,
  };
  
  return searchResponse;
}

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async ({ userId }) => {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    // Extract filter parameters
    const filters = {
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      status: searchParams.get('status') || 'all',
    };
    
    // Extract sort parameters
    const sortField = searchParams.get('sortField') || '';
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    const sort = sortField ? { 
      field: sortField, 
      direction: (sortDirection === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' 
    } : undefined;
    
    // Get data from database
    const UserModel = getUserModel();
    const PoolModel = getPoolModel();
    
    // Get user data to find accessible pools
    const user = await UserModel.findOne({ id: userId });
    if (!user) {
      return { results: createEmptySearchResponse(page, limit) };
    }
    
    // Get pools accessible to this user
    const userPools = await PoolModel.find({ id: { $in: user.pools } });
    
    // Create search collections from DB data
    const pools = userPools.map(pool => ({
      id: pool.id,
      name: pool.name,
      description: pool.description,
      members: pool.memberCount,
      contributionAmount: pool.contributionAmount,
      frequency: pool.frequency,
      totalAmount: pool.totalAmount,
    }));
    
    // Extract members from all pools
    const members = userPools.flatMap(pool =>
      pool.members.map((member: PoolMemberDB) => ({
        id: `${pool.id}-${member.id}`,
        name: member.name,
        email: member.email,
        phone: member.phone || '',
        poolId: pool.id,
        position: member.position,
        status: member.status,
      }))
    );

    // Extract transactions from all pools
    const transactions = userPools.flatMap(pool =>
      pool.transactions.map((txn: PoolTransactionDB) => ({
        id: `${pool.id}-${txn.id}`,
        type: txn.type,
        amount: txn.amount,
        date: txn.date,
        member: txn.member,
        poolId: pool.id,
        status: txn.status,
      }))
    );

    // Extract messages from all pools
    const messages = userPools.flatMap(pool =>
      pool.messages.map((msg: PoolMessageDB) => ({
        id: `${pool.id}-${msg.id}`,
        author: msg.author,
        content: msg.content,
        date: msg.date,
        poolId: pool.id,
      }))
    );
    
    // Perform the search with real data
    const results = performSearch(
      query, category, filters, page, limit, sort,
      pools, members, transactions, messages
    );
    
    return { results };
  }, {
    requireAuth: true,
    methods: ['GET']
  });
}

// Helper function to create an empty search response
function createEmptySearchResponse(page: number, limit: number): SearchResponse {
  const pagination: PaginationInfo = {
    currentPage: page,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false, 
    totalItems: 0,
    itemsPerPage: limit,
  };
  
  return {
    pools: [],
    members: [],
    transactions: [],
    messages: [],
    totalResults: 0,
    pagination,
  };
}