'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Download,
  Filter,
  ChevronDown,
  Search,
  DollarSign,
  PlusCircle,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from 'lucide-react';
import { PaymentProcessingModal } from '../../components/payments/PaymentProcessingModal';
import { PaymentMethodDialog } from '../../components/payments/PaymentMethodDialog';
import { PaymentMethodFormValues } from '../../components/payments/PaymentMethodForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { usePaymentMethods } from '../../lib/hooks/usePaymentMethods';
import { PaymentDetails, TransactionType, TransactionStatus } from '../../types/payment';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { cn } from '../../lib/utils';
import { Skeleton, StatCardSkeleton, ListItemSkeleton, TableRowSkeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';

// Types for API responses
interface UpcomingPayment {
  id: string;
  poolId: string;
  poolName: string;
  amount: number;
  dueDate: string;
  frequency: string;
  currentRound: number;
  totalRounds: number;
  recipientName: string;
  isRecipient: boolean;
  hasContributed: boolean;
  status: 'due' | 'upcoming' | 'overdue' | 'contributed';
  daysUntilDue: number;
}

interface Transaction {
  id: string;
  paymentId: string;
  poolId: string;
  poolName: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string;
  member: string;
  round?: number;
  createdAt: string;
}

interface UpcomingSummary {
  totalDue: number;
  overdueCount: number;
  dueCount: number;
  upcomingCount: number;
  receivingCount: number;
  totalPools: number;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/signin?callbackUrl=/payments");
    },
  });

  const userId = session?.user?.id || '';

  // States for payment modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<UpcomingPayment | null>(null);

  // Data states
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [upcomingSummary, setUpcomingSummary] = useState<UpcomingSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Use the payment methods hook
  const {
    paymentMethods,
    isLoading: isLoadingPaymentMethods,
    addPaymentMethod,
    refreshPaymentMethods
  } = usePaymentMethods({ userId });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch upcoming payments
  const fetchUpcomingPayments = useCallback(async () => {
    if (!session?.user) return;

    setIsLoadingUpcoming(true);
    setUpcomingError(null);

    try {
      const response = await fetch('/api/payments/upcoming');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch upcoming payments');
      }

      setUpcomingPayments(data.payments || []);
      setUpcomingSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching upcoming payments:', error);
      setUpcomingError(error instanceof Error ? error.message : 'Failed to load upcoming payments');
    } finally {
      setIsLoadingUpcoming(false);
    }
  }, [session?.user]);

  // Fetch transaction history
  const fetchTransactionHistory = useCallback(async () => {
    if (!session?.user) return;

    setIsLoadingHistory(true);
    setHistoryError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      if (filterType) {
        params.set('type', filterType);
      }
      if (filterStatus) {
        params.set('status', filterStatus);
      }
      if (filterStartDate) {
        params.set('startDate', filterStartDate);
      }
      if (filterEndDate) {
        params.set('endDate', filterEndDate);
      }

      const response = await fetch(`/api/payments/history?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transaction history');
      }

      setTransactions(data.transactions || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setHistoryError(error instanceof Error ? error.message : 'Failed to load transaction history');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [session?.user, currentPage, debouncedSearch, filterType, filterStatus, filterStartDate, filterEndDate]);

  // Initial data fetch
  useEffect(() => {
    if (session?.user) {
      fetchUpcomingPayments();
    }
  }, [session?.user, fetchUpcomingPayments]);

  useEffect(() => {
    if (session?.user) {
      fetchTransactionHistory();
    }
  }, [session?.user, fetchTransactionHistory]);

  // Payment details for the modal
  const paymentDetails: PaymentDetails = useMemo(() => ({
    poolName: selectedPayment?.poolName || 'N/A',
    amount: selectedPayment?.amount || 0,
    dueDate: selectedPayment?.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    paymentMethods: paymentMethods,
  }), [selectedPayment, paymentMethods]);

  // Handle making a payment
  const handleMakePayment = (payment: UpcomingPayment) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  // Payment modal handlers
  const handleAddPaymentMethod = () => {
    setShowPaymentModal(false);
    setShowPaymentMethodModal(true);
  };

  // Handle payment method addition
  const handlePaymentMethodSubmit = async (values: PaymentMethodFormValues) => {
    try {
      const result = await addPaymentMethod(values);

      if (result.success) {
        setShowPaymentMethodModal(false);
        setShowPaymentModal(true);
      } else {
        console.error('Failed to add payment method:', result.error);
        alert(`Failed to add payment method: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
    }
  };

  // Handle payment completion
  const handlePaymentComplete = async () => {
    setShowPaymentModal(false);
    setSelectedPayment(null);
    // Refresh data
    fetchUpcomingPayments();
    fetchTransactionHistory();
  };

  // Clear filters
  const clearFilters = () => {
    setFilterType('');
    setFilterStatus('');
    setFilterStartDate('');
    setFilterEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filterType || filterStatus || filterStartDate || filterEndDate;

  // Export transactions to CSV
  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Fetch all transactions for export (without pagination)
      const params = new URLSearchParams({
        limit: '1000',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (filterStartDate) params.set('startDate', filterStartDate);
      if (filterEndDate) params.set('endDate', filterEndDate);

      const response = await fetch(`/api/payments/history?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data for export');
      }

      const exportTransactions = data.transactions || [];

      if (exportTransactions.length === 0) {
        alert('No transactions to export');
        return;
      }

      // Generate CSV
      const headers = ['Date', 'Pool', 'Type', 'Amount', 'Status', 'Description'];
      const rows = exportTransactions.map((tx: Transaction) => [
        new Date(tx.createdAt).toLocaleDateString(),
        tx.poolName,
        tx.type,
        `$${tx.amount.toFixed(2)}`,
        tx.status,
        tx.description
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export transactions');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper functions for display
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      scheduled: 'bg-purple-100 text-purple-800',
      escrowed: 'bg-indigo-100 text-indigo-800',
      released: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return styles[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'contribution':
      case 'deposit':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'payout':
      case 'withdrawal':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUpcomingStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'due':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'contributed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Calendar className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatDueDate = (dueDate: string, daysUntilDue: number) => {
    const date = new Date(dueDate);
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (daysUntilDue < 0) {
      return `${formatted} (${Math.abs(daysUntilDue)} days overdue)`;
    } else if (daysUntilDue === 0) {
      return `${formatted} (Due today)`;
    } else if (daysUntilDue === 1) {
      return `${formatted} (Due tomorrow)`;
    } else {
      return `${formatted} (in ${daysUntilDue} days)`;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="space-y-2 mb-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            {[1, 2, 3].map((i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Payment Processing Modal */}
      <PaymentProcessingModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPayment(null);
        }}
        onAddPaymentMethod={handleAddPaymentMethod}
        paymentDetails={paymentDetails}
        userId={userId}
        poolId={selectedPayment?.poolId || ''}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Payment Method Dialog */}
      <PaymentMethodDialog
        isOpen={showPaymentMethodModal}
        onClose={() => {
          setShowPaymentMethodModal(false);
          setShowPaymentModal(true);
        }}
        onSubmit={handlePaymentMethodSubmit}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Payments</h2>
              <p className="mt-1 text-gray-500">
                Track and manage your contributions and payouts
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button
                variant="outline"
                className="flex items-center"
                onClick={handleExport}
                disabled={isExporting || transactions.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          {upcomingSummary && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="text-sm text-gray-500">Total Due</div>
                <div className="text-2xl font-bold text-gray-900">
                  ${upcomingSummary.totalDue.toFixed(2)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="text-sm text-gray-500">Overdue</div>
                <div className={cn(
                  "text-2xl font-bold",
                  upcomingSummary.overdueCount > 0 ? "text-red-600" : "text-gray-900"
                )}>
                  {upcomingSummary.overdueCount}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="text-sm text-gray-500">Due Soon</div>
                <div className={cn(
                  "text-2xl font-bold",
                  upcomingSummary.dueCount > 0 ? "text-orange-600" : "text-gray-900"
                )}>
                  {upcomingSummary.dueCount}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="text-sm text-gray-500">Receiving</div>
                <div className="text-2xl font-bold text-green-600">
                  {upcomingSummary.receivingCount}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Payments */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Payments</CardTitle>
              <CardDescription>
                Scheduled contributions for current pools
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUpcoming ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg border bg-white">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : upcomingError ? (
                <EmptyState
                  icon={AlertCircle}
                  iconColor="orange"
                  title="Unable to load payments"
                  description={upcomingError}
                  action={{
                    label: 'Try Again',
                    onClick: fetchUpcomingPayments,
                    variant: 'outline',
                  }}
                />
              ) : upcomingPayments.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  iconColor="blue"
                  title="No upcoming payments"
                  description="You don't have any upcoming payments. Join or create a pool to start contributing."
                  action={{
                    label: 'Create a Pool',
                    onClick: () => router.push('/create-pool'),
                  }}
                  secondaryAction={{
                    label: 'Learn More',
                    onClick: () => router.push('/help/documentation'),
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {upcomingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border",
                        payment.status === 'overdue' && "border-red-200 bg-red-50",
                        payment.status === 'due' && "border-orange-200 bg-orange-50",
                        payment.status === 'contributed' && "border-green-200 bg-green-50",
                        payment.isRecipient && "border-blue-200 bg-blue-50"
                      )}
                    >
                      <div className="flex items-center space-x-4">
                        {getUpcomingStatusIcon(payment.isRecipient ? 'receiving' : payment.status)}
                        <div>
                          <div className="font-medium text-gray-900">
                            {payment.poolName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.isRecipient ? (
                              <span className="text-green-600 font-medium">
                                You&apos;re receiving this round!
                              </span>
                            ) : (
                              <>
                                Round {payment.currentRound} of {payment.totalRounds}
                                {' • '}
                                To: {payment.recipientName}
                              </>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDueDate(payment.dueDate, payment.daysUntilDue)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            ${payment.amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {payment.frequency}
                          </div>
                        </div>
                        {!payment.isRecipient && !payment.hasContributed && (
                          <Button
                            size="sm"
                            onClick={() => handleMakePayment(payment)}
                            className={cn(
                              payment.status === 'overdue' && "bg-red-600 hover:bg-red-700"
                            )}
                          >
                            Pay Now
                          </Button>
                        )}
                        {payment.hasContributed && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Paid
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    All your payments and receipts ({totalCount} total)
                  </CardDescription>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <button
                      className={cn(
                        "inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium bg-white hover:bg-gray-50",
                        hasActiveFilters
                          ? "border-blue-500 text-blue-700"
                          : "border-gray-300 text-gray-700"
                      )}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                      {hasActiveFilters && (
                        <span className="ml-1 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-xs">
                          !
                        </span>
                      )}
                      <ChevronDown className={cn(
                        "h-4 w-4 ml-2 transition-transform",
                        showFilters && "rotate-180"
                      )} />
                    </button>

                    {/* Filter Dropdown */}
                    {showFilters && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border z-10 p-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-medium">Filters</span>
                          {hasActiveFilters && (
                            <button
                              className="text-sm text-blue-600 hover:text-blue-800"
                              onClick={clearFilters}
                            >
                              Clear all
                            </button>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Type
                            </label>
                            <select
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                              value={filterType}
                              onChange={(e) => {
                                setFilterType(e.target.value);
                                setCurrentPage(1);
                              }}
                            >
                              <option value="">All types</option>
                              <option value="contribution">Contribution</option>
                              <option value="payout">Payout</option>
                              <option value="deposit">Deposit</option>
                              <option value="withdrawal">Withdrawal</option>
                              <option value="escrow">Escrow</option>
                              <option value="refund">Refund</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Status
                            </label>
                            <select
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                              value={filterStatus}
                              onChange={(e) => {
                                setFilterStatus(e.target.value);
                                setCurrentPage(1);
                              }}
                            >
                              <option value="">All statuses</option>
                              <option value="completed">Completed</option>
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="failed">Failed</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Date Range
                            </label>
                            <div className="flex space-x-2">
                              <input
                                type="date"
                                className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
                                value={filterStartDate}
                                onChange={(e) => {
                                  setFilterStartDate(e.target.value);
                                  setCurrentPage(1);
                                }}
                                placeholder="From"
                              />
                              <input
                                type="date"
                                className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
                                value={filterEndDate}
                                onChange={(e) => {
                                  setFilterEndDate(e.target.value);
                                  setCurrentPage(1);
                                }}
                                placeholder="To"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          className="mt-4 w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700"
                          onClick={() => setShowFilters(false)}
                        >
                          Apply Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-gray-500 text-sm">Date</th>
                        <th className="pb-3 font-medium text-gray-500 text-sm">Pool</th>
                        <th className="pb-3 font-medium text-gray-500 text-sm">Type</th>
                        <th className="pb-3 font-medium text-gray-500 text-sm">Amount</th>
                        <th className="pb-3 font-medium text-gray-500 text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <TableRowSkeleton key={i} columns={5} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : historyError ? (
                <EmptyState
                  icon={AlertCircle}
                  iconColor="orange"
                  title="Unable to load history"
                  description={historyError}
                  action={{
                    label: 'Try Again',
                    onClick: fetchTransactionHistory,
                    variant: 'outline',
                  }}
                />
              ) : transactions.length === 0 ? (
                <EmptyState
                  icon={hasActiveFilters || debouncedSearch ? Search : CreditCard}
                  iconColor={hasActiveFilters || debouncedSearch ? 'gray' : 'green'}
                  title={hasActiveFilters || debouncedSearch ? 'No results found' : 'No transaction history'}
                  description={
                    hasActiveFilters || debouncedSearch
                      ? 'No transactions match your filters. Try adjusting your search criteria.'
                      : 'Your transaction history will appear here once you start making contributions or receive payouts.'
                  }
                  action={(hasActiveFilters || debouncedSearch) ? {
                    label: 'Clear Filters',
                    onClick: () => {
                      clearFilters();
                      setSearchQuery('');
                    },
                    variant: 'outline',
                  } : undefined}
                />
              ) : (
                <>
                  {/* Transactions Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-3 font-medium text-gray-500 text-sm">Date</th>
                          <th className="pb-3 font-medium text-gray-500 text-sm">Pool</th>
                          <th className="pb-3 font-medium text-gray-500 text-sm">Type</th>
                          <th className="pb-3 font-medium text-gray-500 text-sm">Amount</th>
                          <th className="pb-3 font-medium text-gray-500 text-sm">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50">
                            <td className="py-3 text-sm text-gray-600">
                              {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-3">
                              <div className="text-sm font-medium text-gray-900">
                                {tx.poolName}
                              </div>
                              {tx.round && (
                                <div className="text-xs text-gray-500">
                                  Round {tx.round}
                                </div>
                              )}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center space-x-2">
                                {getTypeIcon(tx.type)}
                                <span className="text-sm capitalize">{tx.type}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className={cn(
                                "font-medium",
                                tx.type === 'payout' || tx.type === 'withdrawal'
                                  ? "text-green-600"
                                  : "text-gray-900"
                              )}>
                                {tx.type === 'payout' || tx.type === 'withdrawal' ? '+' : '-'}
                                ${tx.amount.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={cn(
                                "inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize",
                                getStatusBadge(tx.status)
                              )}>
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <div className="text-sm text-gray-500">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                        {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
