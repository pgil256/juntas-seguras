import { NextRequest, NextResponse } from 'next/server';
import { SearchResponse } from '@/types/search';

// Mock data for pools
const pools = [
  {
    id: '1',
    name: 'Family Savings Pool',
    description: 'Our shared savings for household expenses and emergencies',
    members: 8,
    contributionAmount: 50,
    frequency: 'Weekly',
    totalAmount: 950,
  },
  {
    id: '2',
    name: 'Vacation Fund',
    description: 'Saving for our annual beach trip',
    members: 6,
    contributionAmount: 25,
    frequency: 'Weekly',
    totalAmount: 600,
  },
  {
    id: '3',
    name: 'Emergency Fund',
    description: 'Group fund for unexpected financial needs',
    members: 10,
    contributionAmount: 30,
    frequency: 'Monthly',
    totalAmount: 1200,
  },
];

// Mock data for members
const members = [
  {
    id: 'm1',
    name: 'Maria Rodriguez',
    email: 'maria@example.com',
    phone: '(555) 234-5678',
    poolId: '1',
    position: 1,
    status: 'completed',
  },
  {
    id: 'm2',
    name: 'Carlos Mendez',
    email: 'carlos@example.com',
    phone: '(555) 345-6789',
    poolId: '1',
    position: 2,
    status: 'completed',
  },
  {
    id: 'm3',
    name: 'Ana Garcia',
    email: 'ana@example.com',
    phone: '(555) 456-7890',
    poolId: '1',
    position: 4,
    status: 'upcoming',
  },
];

// Mock data for transactions
const transactions = [
  {
    id: 't1',
    type: 'contribution',
    amount: 50,
    date: '2025-02-20T10:30:00Z',
    member: 'You',
    poolId: '1',
    status: 'completed',
  },
  {
    id: 't2',
    type: 'contribution',
    amount: 50,
    date: '2025-02-13T10:30:00Z',
    member: 'Ana Garcia',
    poolId: '1',
    status: 'completed',
  },
  {
    id: 't3',
    type: 'payout',
    amount: 400,
    date: '2025-02-15T12:00:00Z',
    member: 'Carlos Mendez',
    poolId: '1',
    status: 'completed',
  },
];

// Mock data for messages
const messages = [
  {
    id: 'msg1',
    author: 'Maria Rodriguez',
    content: 'Just received my payout! Thank you everyone for contributing on time.',
    date: '2025-01-24T14:30:00Z',
    poolId: '1',
  },
  {
    id: 'msg2',
    author: 'Carlos Mendez',
    content: 'I\'ll be traveling next week, but I\'ve already scheduled my payment.',
    date: '2025-02-08T09:15:00Z',
    poolId: '1',
  },
  {
    id: 'msg3',
    author: 'You',
    content: 'Remember that contributions are due every Friday by 6pm.',
    date: '2025-02-10T11:20:00Z',
    poolId: '1',
  },
];

// Perform the search on our mock data
function performSearch(query: string, category: string = 'all', filters: any = {}) {
  // Normalize the search query
  const normalizedQuery = query.toLowerCase();
  
  // Search results containers
  let poolResults = [];
  let memberResults = [];
  let transactionResults = [];
  let messageResults = [];
  
  // Only search if we have a query
  if (normalizedQuery) {
    // Search pools if category is 'all' or 'pools'
    if (category === 'all' || category === 'pools') {
      poolResults = pools
        .filter(pool => 
          pool.name.toLowerCase().includes(normalizedQuery) ||
          pool.description.toLowerCase().includes(normalizedQuery) ||
          pool.frequency.toLowerCase().includes(normalizedQuery)
        )
        .map(pool => ({
          id: pool.id,
          type: 'pool' as const,
          title: pool.name,
          subtitle: `${pool.members} members • ${pool.contributionAmount} ${pool.frequency.toLowerCase()}`,
          matchedFields: ['name', 'description'].filter(field =>
            pool[field as keyof typeof pool]?.toString().toLowerCase().includes(normalizedQuery)
          ),
          url: `/${pool.id}`,
        }));
    }
    
    // Search members if category is 'all' or 'members'
    if (category === 'all' || category === 'members') {
      memberResults = members
        .filter(member => 
          member.name.toLowerCase().includes(normalizedQuery) ||
          member.email.toLowerCase().includes(normalizedQuery) ||
          member.phone.includes(normalizedQuery)
        )
        .map(member => ({
          id: member.id,
          type: 'member' as const,
          title: member.name,
          subtitle: member.email,
          matchedFields: ['name', 'email', 'phone'].filter(field =>
            member[field as keyof typeof member]?.toString().toLowerCase().includes(normalizedQuery)
          ),
          url: `/member-management/${member.poolId}`,
        }));
    }
    
    // Search transactions if category is 'all' or 'transactions'
    if (category === 'all' || category === 'transactions') {
      transactionResults = transactions
        .filter(transaction => 
          transaction.type.toLowerCase().includes(normalizedQuery) ||
          transaction.member.toLowerCase().includes(normalizedQuery) ||
          transaction.amount.toString().includes(normalizedQuery) ||
          transaction.status.toLowerCase().includes(normalizedQuery)
        )
        .map(transaction => ({
          id: transaction.id,
          type: 'transaction' as const,
          title: `${transaction.type === 'contribution' ? 'Payment' : 'Payout'} $${transaction.amount}`,
          subtitle: `By ${transaction.member} • ${new Date(transaction.date).toLocaleDateString()}`,
          matchedFields: ['type', 'member', 'amount', 'status'].filter(field =>
            transaction[field as keyof typeof transaction]?.toString().toLowerCase().includes(normalizedQuery)
          ),
          url: `/payments`,
        }));
    }
    
    // Search messages if category is 'all' or 'messages'
    if (category === 'all' || category === 'messages') {
      messageResults = messages
        .filter(message => 
          message.content.toLowerCase().includes(normalizedQuery) ||
          message.author.toLowerCase().includes(normalizedQuery)
        )
        .map(message => ({
          id: message.id,
          type: 'message' as const,
          title: message.content.length > 60 ? message.content.substring(0, 60) + '...' : message.content,
          subtitle: `From ${message.author} • ${new Date(message.date).toLocaleDateString()}`,
          matchedFields: ['content', 'author'].filter(field =>
            message[field as keyof typeof message]?.toString().toLowerCase().includes(normalizedQuery)
          ),
          url: `/${message.poolId}`,
        }));
    }
  }

  // Apply date filters if provided
  if (filters.dateFrom || filters.dateTo) {
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom).getTime() : 0;
    const dateTo = filters.dateTo ? new Date(filters.dateTo).getTime() : Infinity;
    
    // Filter transactions by date
    transactionResults = transactionResults.filter(result => {
      const txnDate = new Date(
        transactions.find(t => t.id === result.id)?.date || ''
      ).getTime();
      return txnDate >= dateFrom && txnDate <= dateTo;
    });
    
    // Filter messages by date
    messageResults = messageResults.filter(result => {
      const msgDate = new Date(
        messages.find(m => m.id === result.id)?.date || ''
      ).getTime();
      return msgDate >= dateFrom && msgDate <= dateTo;
    });
  }
  
  // Apply status filter if provided and not 'all'
  if (filters.status && filters.status !== 'all') {
    // Filter members by status
    memberResults = memberResults.filter(result => {
      const member = members.find(m => m.id === result.id);
      return member?.status === filters.status;
    });
    
    // Filter transactions by status
    transactionResults = transactionResults.filter(result => {
      const transaction = transactions.find(t => t.id === result.id);
      return transaction?.status === filters.status;
    });
  }
  
  // Construct and return the search response
  const searchResponse: SearchResponse = {
    pools: poolResults,
    members: memberResults,
    transactions: transactionResults,
    messages: messageResults,
    totalResults: poolResults.length + memberResults.length + transactionResults.length + messageResults.length,
  };
  
  return searchResponse;
}

export async function GET(request: NextRequest) {
  // Extract query parameters
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';
  
  // Extract filter parameters
  const filters = {
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    status: searchParams.get('status') || 'all',
  };
  
  // Perform the search
  const results = performSearch(query, category, filters);
  
  // Add artificial delay to simulate API latency (remove in production)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return the search results
  return NextResponse.json({ results });
}