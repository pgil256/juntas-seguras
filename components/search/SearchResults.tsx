'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SearchResponse, SearchResult, PaginationInfo } from '../../types/search';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent } from '../../components/ui/card';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { CreditCard, Users, MessageCircle, Calendar, Info, Clock } from 'lucide-react';

interface SearchResultsProps {
  results: SearchResponse;
  query: string;
  onPageChange?: (page: number) => void;
  currentPage?: number;
}

export function SearchResults({ 
  results, 
  query,
  onPageChange,
  currentPage = 1
}: SearchResultsProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const hasResults = results.totalResults > 0;

  // Get initial tab with results
  const getInitialTabWithResults = () => {
    if (results.pools.length > 0) return 'pools';
    if (results.members.length > 0) return 'members';
    if (results.transactions.length > 0) return 'transactions';
    if (results.messages.length > 0) return 'messages';
    return 'all';
  };

  // Reset active tab when query changes
  useEffect(() => {
    setActiveTab(getInitialTabWithResults());
  }, [query, results]);

  // Helper to highlight matched text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? <span key={i} className="bg-yellow-200">{part}</span> : part
    );
  };

  // Get icon for result type
  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'pool':
        return <Users className="h-5 w-5 text-blue-600" />;
      case 'member':
        return <Avatar className="h-8 w-8"><AvatarFallback>U</AvatarFallback></Avatar>;
      case 'transaction':
        return <CreditCard className="h-5 w-5 text-green-600" />;
      case 'message':
        return <MessageCircle className="h-5 w-5 text-purple-600" />;
      default:
        return null;
    }
  };

  // Get badge for result metadata status
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
    
    switch (status) {
      case 'completed':
        variant = 'default';
        break;
      case 'active':
        variant = 'secondary';
        break;
      case 'pending':
        variant = 'outline';
        break;
      case 'upcoming':
        variant = 'outline';
        break;
      default:
        return null;
    }
    
    return (
      <Badge variant={variant} className="ml-2 text-xs">
        {status}
      </Badge>
    );
  };

  // Get pagination info summary
  const getPaginationSummary = (pagination?: PaginationInfo) => {
    if (!pagination) return '';
    
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const end = Math.min(
      pagination.currentPage * pagination.itemsPerPage,
      pagination.totalItems
    );
    
    return `Showing ${start}-${end} of ${pagination.totalItems}`;
  };

  // Handle tab change potentially with page reset
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value !== activeTab && onPageChange) {
      onPageChange(1); // Reset to page 1 when changing tabs
    }
  };

  if (!hasResults) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No results found for "{query}"</p>
            <p className="text-sm text-gray-400">Try different keywords or check your spelling</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
        <p className="text-sm text-gray-500">
          Found {results.totalResults} results for "{query}"
        </p>
        
        {results.pagination && (
          <p className="text-xs text-gray-400 mt-1 sm:mt-0">
            {getPaginationSummary(results.pagination)}
          </p>
        )}
      </div>

      <Tabs defaultValue={getInitialTabWithResults()} value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">
            All ({results.totalResults})
          </TabsTrigger>
          {results.pools.length > 0 && (
            <TabsTrigger value="pools">
              Pools ({results.pools.length})
            </TabsTrigger>
          )}
          {results.members.length > 0 && (
            <TabsTrigger value="members">
              Members ({results.members.length})
            </TabsTrigger>
          )}
          {results.transactions.length > 0 && (
            <TabsTrigger value="transactions">
              Transactions ({results.transactions.length})
            </TabsTrigger>
          )}
          {results.messages.length > 0 && (
            <TabsTrigger value="messages">
              Messages ({results.messages.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* All Results */}
        <TabsContent value="all">
          <div className="space-y-6">
            {results.pools.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Pools</h3>
                <div className="space-y-2">
                  {results.pools.map(result => (
                    <ResultCard 
                      key={result.id} 
                      result={result} 
                      query={query} 
                      highlightMatch={highlightMatch}
                      getIcon={getIcon}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Members section */}
            {results.members.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Members</h3>
                <div className="space-y-2">
                  {results.members.map(result => (
                    <ResultCard 
                      key={result.id} 
                      result={result} 
                      query={query} 
                      highlightMatch={highlightMatch}
                      getIcon={getIcon}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Transactions section */}
            {results.transactions.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Transactions</h3>
                <div className="space-y-2">
                  {results.transactions.map(result => (
                    <ResultCard 
                      key={result.id} 
                      result={result} 
                      query={query} 
                      highlightMatch={highlightMatch}
                      getIcon={getIcon}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Messages section */}
            {results.messages.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Messages</h3>
                <div className="space-y-2">
                  {results.messages.map(result => (
                    <ResultCard 
                      key={result.id} 
                      result={result} 
                      query={query} 
                      highlightMatch={highlightMatch}
                      getIcon={getIcon}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Pools Tab */}
        <TabsContent value="pools">
          <div className="space-y-2">
            {results.pools.map(result => (
              <ResultCard 
                key={result.id} 
                result={result} 
                query={query} 
                highlightMatch={highlightMatch}
                getIcon={getIcon}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <div className="space-y-2">
            {results.members.map(result => (
              <ResultCard 
                key={result.id} 
                result={result} 
                query={query} 
                highlightMatch={highlightMatch}
                getIcon={getIcon}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        </TabsContent>
        
        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <div className="space-y-2">
            {results.transactions.map(result => (
              <ResultCard 
                key={result.id} 
                result={result} 
                query={query} 
                highlightMatch={highlightMatch}
                getIcon={getIcon}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        </TabsContent>
        
        {/* Messages Tab */}
        <TabsContent value="messages">
          <div className="space-y-2">
            {results.messages.map(result => (
              <ResultCard 
                key={result.id} 
                result={result} 
                query={query} 
                highlightMatch={highlightMatch}
                getIcon={getIcon}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component for individual result cards
interface ResultCardProps {
  result: SearchResult;
  query: string;
  highlightMatch: (text: string, query: string) => React.ReactNode;
  getIcon: (type: SearchResult['type']) => React.ReactNode;
  getStatusBadge: (status?: string) => React.ReactNode;
}

function ResultCard({ 
  result, 
  query, 
  highlightMatch, 
  getIcon,
  getStatusBadge
}: ResultCardProps) {
  // Format date if available
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return null;
    }
  };

  return (
    <Link href={result.url}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="mr-3 flex-shrink-0">
              {getIcon(result.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {highlightMatch(result.title, query)}
                </h4>
                {/* Add status badge if available */}
                {getStatusBadge(result.metadata?.status as string)}
              </div>
              
              {result.subtitle && (
                <p className="text-sm text-gray-500 truncate">
                  {highlightMatch(result.subtitle, query)}
                </p>
              )}
              
              <div className="flex items-center mt-1">
                <div className="text-xs text-gray-400 capitalize">
                  {result.type}
                </div>
                
                {result.matchedFields && result.matchedFields.length > 0 && (
                  <div className="ml-2 flex items-center text-xs text-gray-400">
                    <Info className="h-3 w-3 mr-1" />
                    <span>
                      Match: {result.matchedFields.slice(0, 2).join(', ')}
                      {result.matchedFields.length > 2 && '...'}
                    </span>
                  </div>
                )}
                
                {formatDate(result.metadata?.date as string) && (
                  <div className="ml-2 flex items-center text-xs text-gray-400">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{formatDate(result.metadata?.date as string)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}