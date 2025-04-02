'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SearchResult } from '@/types/search';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreditCard, Users, Calendar, MessageCircle } from 'lucide-react';

interface SearchResultsProps {
  results: {
    pools: SearchResult[];
    members: SearchResult[];
    transactions: SearchResult[];
    messages: SearchResult[];
    totalResults: number;
  };
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
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
      <p className="text-sm text-gray-500 mb-4">
        Found {results.totalResults} results for "{query}"
      </p>

      <Tabs defaultValue={getInitialTabWithResults()} onValueChange={setActiveTab}>
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
                  {results.pools.slice(0, 3).map(result => (
                    <ResultCard 
                      key={result.id} 
                      result={result} 
                      query={query} 
                      highlightMatch={highlightMatch}
                      getIcon={getIcon}
                    />
                  ))}
                  {results.pools.length > 3 && (
                    <div className="text-right mt-2">
                      <Link 
                        href="#" 
                        onClick={() => setActiveTab('pools')}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View all {results.pools.length} pools
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Similar sections for other result types */}
            {results.members.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Members</h3>
                <div className="space-y-2">
                  {results.members.slice(0, 3).map(result => (
                    <ResultCard 
                      key={result.id} 
                      result={result} 
                      query={query} 
                      highlightMatch={highlightMatch}
                      getIcon={getIcon}
                    />
                  ))}
                  {results.members.length > 3 && (
                    <div className="text-right mt-2">
                      <Link 
                        href="#" 
                        onClick={() => setActiveTab('members')}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View all {results.members.length} members
                      </Link>
                    </div>
                  )}
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
              />
            ))}
          </div>
        </TabsContent>

        {/* Add similar TabsContent sections for members, transactions, messages */}
        <TabsContent value="members">
          <div className="space-y-2">
            {results.members.map(result => (
              <ResultCard 
                key={result.id} 
                result={result} 
                query={query} 
                highlightMatch={highlightMatch}
                getIcon={getIcon}
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
}

function ResultCard({ result, query, highlightMatch, getIcon }: ResultCardProps) {
  return (
    <Link href={result.url}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="mr-3 flex-shrink-0">
              {getIcon(result.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {highlightMatch(result.title, query)}
              </h4>
              {result.subtitle && (
                <p className="text-sm text-gray-500 truncate">
                  {highlightMatch(result.subtitle, query)}
                </p>
              )}
              <div className="text-xs text-gray-400 mt-1 capitalize">
                {result.type}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}