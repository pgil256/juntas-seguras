'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Filter,
  ChevronDown,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  DollarSign,
} from 'lucide-react';
import { PaymentProcessingModal } from '@/components/payments/PaymentProcessingModal';
import { PaymentMethodDialog } from '@/components/payments/PaymentMethodDialog';
import { PaymentMethodFormValues } from '@/components/payments/PaymentMethodForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { usePaymentMethods } from '@/lib/hooks/usePaymentMethods';
import { Transaction, TransactionStatus, TransactionType, PaymentDetails } from '@/types/payment';

// For demo purposes - in a real app, this would come from authentication context
const mockUserId = 'user123';
const mockPoolId = 'pool456';

// Sample transaction data
const allTransactions = [
  {
    id: '1',
    type: TransactionType.DEPOSIT,
    amount: 5.0,
    date: '2025-02-20',
    status: TransactionStatus.COMPLETED,
    description: 'Weekly contribution',
    member: 'You',
  },
  {
    id: '2',
    type: TransactionType.WITHDRAWAL,
    amount: 40.0,
    date: '2025-02-15',
    status: TransactionStatus.COMPLETED,
    description: 'Carlos Mendez payout',
    member: 'Carlos Mendez',
  },
  {
    id: '3',
    type: TransactionType.DEPOSIT,
    amount: 5.0,
    date: '2025-02-13',
    status: TransactionStatus.COMPLETED,
    description: 'Weekly contribution',
    member: 'You',
  },
  {
    id: '4',
    type: TransactionType.DEPOSIT,
    amount: 5.0,
    date: '2025-02-06',
    status: TransactionStatus.COMPLETED,
    description: 'Weekly contribution',
    member: 'You',
  },
  {
    id: '5',
    type: TransactionType.DEPOSIT,
    amount: 5.0,
    date: '2025-01-30',
    status: TransactionStatus.COMPLETED,
    description: 'Weekly contribution',
    member: 'You',
  },
  {
    id: '6',
    type: TransactionType.WITHDRAWAL,
    amount: 40.0,
    date: '2025-01-24',
    status: TransactionStatus.COMPLETED,
    description: 'Maria Rodriguez payout',
    member: 'Maria Rodriguez',
  },
  {
    id: '7',
    type: TransactionType.DEPOSIT,
    amount: 5.0,
    date: '2025-01-23',
    status: TransactionStatus.COMPLETED,
    description: 'Weekly contribution',
    member: 'You',
  },
  {
    id: '8',
    type: TransactionType.DEPOSIT,
    amount: 5.0,
    date: '2025-01-16',
    status: TransactionStatus.COMPLETED,
    description: 'Weekly contribution',
    member: 'You',
  },
  {
    id: '9',
    type: TransactionType.DEPOSIT,
    amount: 5.0,
    date: '2025-03-01',
    status: TransactionStatus.PENDING,
    description: 'Weekly contribution',
    member: 'You',
  },
  {
    id: '10',
    type: TransactionType.DEPOSIT,
    amount: 5.0,
    date: '2025-01-09',
    status: TransactionStatus.FAILED,
    description: 'Weekly contribution - insufficient funds',
    member: 'Sofia Torres',
  },
];

// Upcoming payments data
const upcomingPayments = [
  {
    id: 1,
    member: 'You',
    dueDate: '2025-03-01',
    amount: 5.0,
    status: 'scheduled',
  },
  {
    id: 2,
    member: 'Maria Rodriguez',
    dueDate: '2025-03-01',
    amount: 5.0,
    status: 'pending',
  },
  {
    id: 3,
    member: 'Carlos Mendez',
    dueDate: '2025-03-01',
    amount: 5.0,
    status: 'pending',
  },
  {
    id: 4,
    member: 'Ana Garcia',
    dueDate: '2025-03-01',
    amount: 5.0,
    status: 'pending',
  },
  {
    id: 5,
    member: 'Juan Perez',
    dueDate: '2025-03-01',
    amount: 5.0,
    status: 'pending',
  },
];

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(allTransactions);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    dateRange: 'all',
    search: '',
  });
  
  // States for payment modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  
  // Use the payment methods hook
  const { 
    paymentMethods, 
    isLoading: isLoadingPaymentMethods, 
    error: paymentMethodsError,
    addPaymentMethod,
    removePaymentMethod,
    refreshPaymentMethods
  } = usePaymentMethods({ userId: mockUserId });
  
  // Find the pending payment from upcomingPayments for the current user
  const userPendingPayment = upcomingPayments.find(
    payment => payment.member === 'You' && payment.status !== 'completed'
  );
  
  // Payment details for the modal
  const paymentDetails: PaymentDetails = {
    poolName: 'Family Savings Pool',
    amount: userPendingPayment?.amount || 5.0,
    dueDate: userPendingPayment?.dueDate || '2025-03-01',
    paymentMethods: paymentMethods,
  };

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (currentFilters: typeof filters) => {
    let filtered = allTransactions;

    // Filter by type
    if (currentFilters.type !== 'all') {
      filtered = filtered.filter((t) => t.type === currentFilters.type);
    }

    // Filter by status
    if (currentFilters.status !== 'all') {
      filtered = filtered.filter((t) => t.status === currentFilters.status);
    }

    // Filter by date range
    if (currentFilters.dateRange !== 'all') {
      const now = new Date();
      const pastDate = new Date();

      switch (currentFilters.dateRange) {
        case 'week':
          pastDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          pastDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          pastDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= pastDate && transactionDate <= now;
      });
    }

    // Filter by search
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(searchLower) ||
          t.member.toLowerCase().includes(searchLower)
      );
    }

    setTransactions(filtered);
  };

  const resetFilters = () => {
    const newFilters = {
      type: 'all',
      status: 'all',
      dateRange: 'all',
      search: '',
    };
    setFilters(newFilters);
    setTransactions(allTransactions);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'scheduled':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-5 w-5 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  // Payment modal handlers
  const handleAddPaymentMethod = () => {
    // Close payment modal and open payment method modal
    setShowPaymentModal(false);
    setShowPaymentMethodModal(true);
  };
  
  // Handle payment method addition
  const handlePaymentMethodSubmit = async (values: PaymentMethodFormValues) => {
    try {
      // Add payment method using the hook
      const result = await addPaymentMethod(values);
      
      if (result.success) {
        // Close method modal and reopen payment modal
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
    // Refresh transactions list
    // In a real app, this would fetch from the API
    // For demo purposes, we'll update our mock data
    const newTransaction = {
      id: `${Date.now()}`,
      type: TransactionType.DEPOSIT,
      amount: paymentDetails.amount,
      date: new Date().toISOString().split('T')[0],
      status: TransactionStatus.COMPLETED,
      description: 'Weekly contribution',
      member: 'You',
    };
    
    setTransactions([newTransaction, ...transactions]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Payment Processing Modal */}
      <PaymentProcessingModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onAddPaymentMethod={handleAddPaymentMethod}
        paymentDetails={paymentDetails}
        userId={mockUserId}
        poolId={mockPoolId}
        onPaymentComplete={handlePaymentComplete}
      />
      
      {/* Payment Method Dialog */}
      <PaymentMethodDialog
        isOpen={showPaymentMethodModal}
        onClose={() => {
          setShowPaymentMethodModal(false);
          // Reopen payment modal when closing payment method modal
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
              <Button variant="outline" className="flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button 
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Make Payment
              </Button>
            </div>
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Payments</CardTitle>
              <CardDescription>
                Scheduled contributions for the current cycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Member
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Due Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Amount
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {upcomingPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.member}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payment.dueDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(payment.status)}
                            <span className="ml-2 text-sm text-gray-500 capitalize">
                              {payment.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.member === "You" &&
                            payment.status !== "completed" && (
                              <Button 
                                variant="link" 
                                className="h-auto p-0 text-blue-600 hover:text-blue-800 font-medium"
                                onClick={() => setShowPaymentModal(true)}
                              >
                                Pay Now
                              </Button>
                            )}
                          {payment.member !== "You" && (
                            <Button 
                              variant="link"
                              className="h-auto p-0 text-gray-600 hover:text-gray-800 font-medium"
                            >
                              Send Reminder
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    All your payments and receipts
                  </CardDescription>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={filters.search}
                      onChange={(e) =>
                        handleFilterChange("search", e.target.value)
                      }
                    />
                  </div>
                  <div className="relative">
                    <button
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      onClick={() => setFilterOpen(!filterOpen)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </button>

                    {filterOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                        <div className="p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">
                            Filters
                          </h4>

                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Transaction Type
                            </label>
                            <select
                              className="w-full border border-gray-300 rounded-md p-2"
                              value={filters.type}
                              onChange={(e) =>
                                handleFilterChange("type", e.target.value)
                              }
                            >
                              <option value="all">All Types</option>
                              <option value="deposit">Deposits</option>
                              <option value="withdrawal">Withdrawals</option>
                            </select>
                          </div>

                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Status
                            </label>
                            <select
                              className="w-full border border-gray-300 rounded-md p-2"
                              value={filters.status}
                              onChange={(e) =>
                                handleFilterChange("status", e.target.value)
                              }
                            >
                              <option value="all">All Statuses</option>
                              <option value="completed">Completed</option>
                              <option value="pending">Pending</option>
                              <option value="failed">Failed</option>
                            </select>
                          </div>

                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Date Range
                            </label>
                            <select
                              className="w-full border border-gray-300 rounded-md p-2"
                              value={filters.dateRange}
                              onChange={(e) =>
                                handleFilterChange("dateRange", e.target.value)
                              }
                            >
                              <option value="all">All Time</option>
                              <option value="week">Last 7 Days</option>
                              <option value="month">Last 30 Days</option>
                              <option value="year">Last Year</option>
                            </select>
                          </div>

                          <div className="flex justify-between">
                            <button
                              className="text-sm text-gray-600 hover:text-gray-900"
                              onClick={resetFilters}
                            >
                              Reset Filters
                            </button>
                            <button
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                              onClick={() => setFilterOpen(false)}
                            >
                              Apply Filters
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Transaction
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Member
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Amount
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 capitalize">
                                {transaction.type}
                              </div>
                              <div className="text-sm text-gray-500">
                                {transaction.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.member}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.type === "deposit" ? "- " : "+ "}
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(transaction.status)}
                            <span className="ml-2 text-sm text-gray-500 capitalize">
                              {transaction.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}