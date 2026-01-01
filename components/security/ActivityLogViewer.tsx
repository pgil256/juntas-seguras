'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActivityLog, ActivityType } from '../../types/security';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Loader2, Shield, LogIn, LogOut, Key, User, CreditCard, Settings, AlertTriangle, Calendar, Map, Monitor } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../../components/ui/pagination';
import { Badge } from '../../components/ui/badge';

interface ActivityLogViewerProps {
  userId: string;
}

export default function ActivityLogViewer({ userId }: ActivityLogViewerProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');

  // Fetch activity logs
  const fetchLogs = useCallback(async (page = 1, activityType: ActivityType | 'all' = 'all') => {
    setLoading(true);
    setError(null);

    try {
      let url = `/api/security/activity-log?userId=${userId}&page=${page}`;

      if (activityType !== 'all') {
        url += `&type=${activityType}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      const data = await response.json();

      setLogs(data.logs);
      setCurrentPage(data.pagination.currentPage);
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.totalItems);
    } catch (error: any) {
      setError(error.message || 'An error occurred while fetching activity logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch on mount
  useEffect(() => {
    fetchLogs(1, filter);
  }, [fetchLogs, filter]);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    fetchLogs(page, filter);
  };
  
  // Handle filter change
  const handleFilterChange = (type: string) => {
    setFilter(type as ActivityType | 'all');
    fetchLogs(1, type as ActivityType | 'all');
  };
  
  // Get icon for activity type
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case ActivityType.LOGIN:
        return <LogIn className="h-4 w-4" />;
      case ActivityType.LOGOUT:
        return <LogOut className="h-4 w-4" />;
      case ActivityType.PASSWORD_CHANGE:
      case ActivityType.ACCOUNT_RECOVERY:
        return <Key className="h-4 w-4" />;
      case ActivityType.EMAIL_CHANGE:
      case ActivityType.PHONE_CHANGE:
      case ActivityType.PROFILE_UPDATE:
        return <User className="h-4 w-4" />;
      case ActivityType.TWO_FACTOR_SETUP:
      case ActivityType.TWO_FACTOR_DISABLE:
        return <Shield className="h-4 w-4" />;
      case ActivityType.PAYMENT_METHOD_ADD:
      case ActivityType.PAYMENT_METHOD_REMOVE:
      case ActivityType.PAYMENT_SENT:
      case ActivityType.PAYMENT_RECEIVED:
        return <CreditCard className="h-4 w-4" />;
      case ActivityType.SETTINGS_CHANGE:
        return <Settings className="h-4 w-4" />;
      case ActivityType.SUSPICIOUS_ACTIVITY:
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };
  
  // Get activity description
  const getActivityDescription = (log: ActivityLog) => {
    switch (log.type) {
      case ActivityType.LOGIN:
        return 'Signed in to account';
      case ActivityType.LOGOUT:
        return 'Signed out of account';
      case ActivityType.PASSWORD_CHANGE:
        return 'Changed account password';
      case ActivityType.EMAIL_CHANGE:
        return 'Updated email address';
      case ActivityType.PHONE_CHANGE:
        return 'Updated phone number';
      case ActivityType.PROFILE_UPDATE:
        return 'Updated profile information';
      case ActivityType.SETTINGS_CHANGE:
        return 'Changed account settings';
      case ActivityType.TWO_FACTOR_SETUP:
        return `Set up two-factor authentication (${log.metadata?.method || 'unknown method'})`;
      case ActivityType.TWO_FACTOR_DISABLE:
        return 'Disabled two-factor authentication';
      case ActivityType.PAYMENT_METHOD_ADD:
        return `Added payment method (${log.metadata?.type || 'unknown type'})`;
      case ActivityType.PAYMENT_METHOD_REMOVE:
        return `Removed payment method (${log.metadata?.type || 'unknown type'})`;
      case ActivityType.POOL_JOIN:
        return `Joined pool (${log.metadata?.poolName || 'unknown pool'})`;
      case ActivityType.POOL_CREATE:
        return `Created new pool (${log.metadata?.poolName || 'unknown pool'})`;
      case ActivityType.PAYMENT_SENT:
        return `Sent payment of ${log.metadata?.amount || 'unknown amount'}`;
      case ActivityType.PAYMENT_RECEIVED:
        return `Received payment of ${log.metadata?.amount || 'unknown amount'}`;
      case ActivityType.ACCOUNT_RECOVERY:
        return 'Recovered account access';
      case ActivityType.SUSPICIOUS_ACTIVITY:
        return `Suspicious activity detected (${log.metadata?.reason || 'unknown reason'})`;
      default:
        return 'Account activity';
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Account Activity</CardTitle>
          <CardDescription>
            Recent activity and security events for your account
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={filter}
            onValueChange={handleFilterChange}
          >
            <SelectTrigger className="w-36 h-8">
              <SelectValue placeholder="All activities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All activities</SelectItem>
              <SelectItem value={ActivityType.LOGIN}>Sign-ins</SelectItem>
              <SelectItem value={ActivityType.PASSWORD_CHANGE}>Password changes</SelectItem>
              <SelectItem value={ActivityType.TWO_FACTOR_SETUP}>2FA changes</SelectItem>
              <SelectItem value={ActivityType.PAYMENT_SENT}>Payments</SelectItem>
              <SelectItem value={ActivityType.POOL_JOIN}>Pool activity</SelectItem>
              <SelectItem value={ActivityType.SUSPICIOUS_ACTIVITY}>Suspicious activity</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(currentPage, filter)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No activity found</p>
            <p className="text-sm">
              {filter === 'all'
                ? 'Your account activity will appear here'
                : `No ${filter} activity found for your account`}
            </p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-4">
              Showing {(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalItems)} of {totalItems} activities
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Date & Time</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead className="hidden md:table-cell">Device</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-gray-600">
                        {formatDate(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="rounded-full p-1 bg-gray-100">
                            {getActivityIcon(log.type)}
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {getActivityDescription(log)}
                            </div>
                            {log.type === ActivityType.SUSPICIOUS_ACTIVITY && (
                              <Badge variant="destructive" className="mt-1">Security alert</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center space-x-1 text-xs text-gray-600">
                          <Map className="h-3 w-3" />
                          <span>
                            {log.location?.city ? (
                              `${log.location.city}, ${log.location.country}`
                            ) : (
                              'Unknown location'
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center space-x-1 text-xs text-gray-600">
                          <Monitor className="h-3 w-3" />
                          <span>
                            {log.deviceInfo?.browser ? (
                              `${log.deviceInfo.browser} on ${log.deviceInfo.os}`
                            ) : (
                              'Unknown device'
                            )}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show 5 page numbers, with current page in the middle if possible
                      let pageToShow;
                      
                      if (totalPages <= 5) {
                        pageToShow = i + 1;
                      } else if (currentPage <= 3) {
                        pageToShow = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageToShow = totalPages - 4 + i;
                      } else {
                        pageToShow = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageToShow}>
                          <PaginationLink
                            onClick={() => handlePageChange(pageToShow)}
                            isActive={currentPage === pageToShow}
                          >
                            {pageToShow}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}