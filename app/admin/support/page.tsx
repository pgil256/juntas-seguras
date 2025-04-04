'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Users, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Bell, 
  BarChart3,
  Inbox,
  HelpCircle,
  User,
  Calendar
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { SupportTicket, TicketStatus, TicketPriority } from '@/types/support';
import { useTickets } from '@/lib/hooks/useTickets';
import TicketViewer from '@/components/support/TicketViewer';

export default function AdminSupportDashboard() {
  const [view, setView] = useState<'list' | 'view' | 'stats'>('list');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Admin has full access to all tickets
  const { 
    tickets, 
    isLoading, 
    error, 
    stats,
    fetchStats
  } = useTickets({ isAdmin: true });
  
  // Fetch stats when switching to stats view
  const handleViewStats = () => {
    fetchStats();
    setView('stats');
  };
  
  // Filter tickets based on search, status, and priority
  const filteredTickets = tickets.filter(ticket => {
    // Search query filter
    const matchesSearch = !searchQuery || 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    
    // Priority filter
    const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };
  
  // Get status badge styles
  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'bg-blue-100 text-blue-800';
      case TicketStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800';
      case TicketStatus.WAITING:
        return 'bg-purple-100 text-purple-800';
      case TicketStatus.RESOLVED:
        return 'bg-green-100 text-green-800';
      case TicketStatus.CLOSED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get priority badge styles
  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.LOW:
        return 'bg-green-100 text-green-800';
      case TicketPriority.NORMAL:
        return 'bg-blue-100 text-blue-800';
      case TicketPriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case TicketPriority.URGENT:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Format status for display
  const formatStatus = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.IN_PROGRESS:
        return 'In Progress';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  // View a specific ticket
  const viewTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setView('view');
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
    setPriorityFilter(null);
  };
  
  // Render tickets table
  const renderTicketsTable = () => {
    if (filteredTickets.length === 0) {
      return (
        <div className="p-8 text-center">
          <Inbox className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No tickets match your filters</p>
          <Button onClick={resetFilters} variant="outline" className="mt-4">
            Reset Filters
          </Button>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-mono text-xs">{ticket.id}</TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center">
                  {ticket.responses && ticket.responses.length > 0 ? (
                    <Badge variant="outline" className="mr-2 bg-blue-50">
                      {ticket.responses.length}
                    </Badge>
                  ) : null}
                  {ticket.subject}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm">{ticket.userName}</span>
                  <span className="text-xs text-gray-500">{ticket.userEmail}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusBadge(ticket.status)}>
                  {formatStatus(ticket.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getPriorityBadge(ticket.priority)}>
                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {formatDate(ticket.updatedAt)}
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => viewTicket(ticket.id)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // Render statistics view
  const renderStatsView = () => {
    if (!stats) {
      return (
        <div className="p-8 text-center">
          <Clock className="h-10 w-10 mx-auto text-gray-300 animate-pulse mb-2" />
          <p className="text-gray-500">Loading statistics...</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Tickets</p>
                  <h2 className="text-3xl font-bold">{stats.total}</h2>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Inbox className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Open</p>
                  <h2 className="text-3xl font-bold">{stats.open + stats.inProgress + stats.waiting}</h2>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Bell className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Resolved</p>
                  <h2 className="text-3xl font-bold">{stats.resolved}</h2>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Urgent</p>
                  <h2 className="text-3xl font-bold">{stats.byPriority[TicketPriority.URGENT] || 0}</h2>
                </div>
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts and detailed stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span>Open</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">{stats.open}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({Math.round((stats.open / stats.total) * 100)}%)
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">{stats.inProgress}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({Math.round((stats.inProgress / stats.total) * 100)}%)
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                    <span>Waiting</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">{stats.waiting}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({Math.round((stats.waiting / stats.total) * 100)}%)
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span>Resolved</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">{stats.resolved}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({Math.round((stats.resolved / stats.total) * 100)}%)
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                    <span>Closed</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">{stats.closed}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({Math.round((stats.closed / stats.total) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Category breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.byCategory).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="capitalize">{category}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">{count}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({Math.round((count / stats.total) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Button onClick={() => setView('list')} variant="outline">
          Back to Ticket List
        </Button>
      </div>
    );
  };
  
  // Render content based on current view
  const renderContent = () => {
    switch (view) {
      case 'view':
        if (!selectedTicketId) {
          return <div>No ticket selected</div>;
        }
        return (
          <div className="max-w-3xl mx-auto px-4">
            <TicketViewer 
              ticketId={selectedTicketId}
              isAdmin={true}
              onBack={() => setView('list')}
            />
          </div>
        );
        
      case 'stats':
        return renderStatsView();
        
      case 'list':
      default:
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Support Ticket Dashboard</CardTitle>
                <CardDescription>
                  Manage and respond to customer support tickets
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleViewStats}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Statistics
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 mb-6">
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center w-full sm:w-auto space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Select
                      value={statusFilter || ''}
                      onValueChange={(value) => setStatusFilter(value || null)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Statuses</SelectItem>
                        {Object.values(TicketStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {formatStatus(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={priorityFilter || ''}
                      onValueChange={(value) => setPriorityFilter(value || null)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Priorities</SelectItem>
                        {Object.values(TicketPriority).map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    onClick={resetFilters}
                    size="sm"
                    className="h-9"
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    Reset Filters
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="p-8 text-center">
                  <Clock className="h-8 w-8 mx-auto text-gray-300 animate-pulse mb-2" />
                  <p className="text-gray-500">Loading tickets...</p>
                </div>
              ) : (
                <Tabs defaultValue="all">
                  <TabsList className="mb-2">
                    <TabsTrigger value="all">All Tickets</TabsTrigger>
                    <TabsTrigger value="open">Open</TabsTrigger>
                    <TabsTrigger value="waiting">Waiting</TabsTrigger>
                    <TabsTrigger value="urgent">Urgent</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="mt-0">
                    {renderTicketsTable()}
                  </TabsContent>
                  
                  <TabsContent value="open" className="mt-0">
                    {renderTicketsTable()}
                  </TabsContent>
                  
                  <TabsContent value="waiting" className="mt-0">
                    {renderTicketsTable()}
                  </TabsContent>
                  
                  <TabsContent value="urgent" className="mt-0">
                    {renderTicketsTable()}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
            
            <CardFooter className="flex justify-between border-t pt-6">
              <div className="flex items-center text-sm text-gray-500">
                <Users className="h-4 w-4 mr-1" />
                <span>
                  {filteredTickets.length} of {tickets.length} tickets
                </span>
              </div>
              
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Last refreshed: {format(new Date(), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </CardFooter>
          </Card>
        );
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      {renderContent()}
    </div>
  );
}