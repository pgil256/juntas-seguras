'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  MessageSquare, 
  Search, 
  Clock, 
  CheckCircle, 
  MoreHorizontal, 
  HelpCircle,
  ChevronLeft
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { SupportTicket, TicketStatus } from '@/types/support';
import { useTickets } from '@/lib/hooks/useTickets';
import ContactForm from '@/components/support/ContactForm';
import TicketViewer from '@/components/support/TicketViewer';

// Mock user data (would come from authentication in a real app)
const mockUser = {
  id: 'user123',
  name: 'John Doe',
  email: 'john@example.com'
};

export default function SupportPage() {
  const [view, setView] = useState<'list' | 'create' | 'view'>('list');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    tickets, 
    isLoading, 
    error, 
    refreshTickets 
  } = useTickets({ userId: mockUser.id });
  
  // Filter tickets based on search query
  const filteredTickets = tickets.filter(ticket => 
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.status.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter tickets by status for tabs
  const openTickets = tickets.filter(ticket => 
    [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING].includes(ticket.status)
  );
  
  const closedTickets = tickets.filter(ticket => 
    [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(ticket.status)
  );
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
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
  
  // Handle form submission success
  const handleTicketCreated = () => {
    setView('list');
    refreshTickets();
  };
  
  // Render tickets table
  const renderTicketsTable = (ticketsList: SupportTicket[]) => {
    if (ticketsList.length === 0) {
      return (
        <div className="p-8 text-center">
          <HelpCircle className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 mb-4">No tickets found</p>
          <Button onClick={() => setView('create')}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Ticket
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
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ticketsList.map((ticket) => (
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
                <Badge className={getStatusBadge(ticket.status)}>
                  {formatStatus(ticket.status)}
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
  
  // Render content based on current view
  const renderContent = () => {
    switch (view) {
      case 'create':
        return (
          <div className="max-w-2xl mx-auto px-4">
            <div className="mb-6">
              <Button 
                variant="ghost" 
                onClick={() => setView('list')}
                className="p-0 h-8"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to tickets
              </Button>
            </div>
            <ContactForm 
              userId={mockUser.id}
              userName={mockUser.name}
              userEmail={mockUser.email}
              onSuccess={handleTicketCreated}
              onCancel={() => setView('list')}
            />
          </div>
        );
        
      case 'view':
        if (!selectedTicketId) {
          return <div>No ticket selected</div>;
        }
        return (
          <div className="max-w-3xl mx-auto px-4">
            <TicketViewer 
              ticketId={selectedTicketId}
              userId={mockUser.id}
              onBack={() => setView('list')}
            />
          </div>
        );
        
      case 'list':
      default:
        return (
          <div className="container mx-auto p-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Support Tickets</CardTitle>
                  <CardDescription>
                    View and manage your support requests
                  </CardDescription>
                </div>
                <Button onClick={() => setView('create')}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Ticket
                </Button>
              </CardHeader>
              
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center w-full max-w-sm space-x-2">
                    <Input
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button type="submit" size="icon" variant="ghost">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{mockUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm hidden md:block">
                      <div className="font-medium">{mockUser.name}</div>
                      <div className="text-gray-500 text-xs">{mockUser.email}</div>
                    </div>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="p-8 text-center">
                    <Clock className="h-8 w-8 mx-auto text-gray-300 animate-pulse mb-2" />
                    <p className="text-gray-500">Loading your tickets...</p>
                  </div>
                ) : (
                  <Tabs defaultValue="active">
                    <TabsList className="mb-2">
                      <TabsTrigger value="active" className="relative">
                        Active
                        {openTickets.length > 0 && (
                          <Badge className="ml-2 bg-blue-100 text-blue-800">
                            {openTickets.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="closed">
                        Closed
                        {closedTickets.length > 0 && (
                          <Badge className="ml-2 bg-gray-100 text-gray-800">
                            {closedTickets.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="all">All Tickets</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="active" className="mt-0">
                      {renderTicketsTable(
                        searchQuery ? 
                          filteredTickets.filter(t => 
                            [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING].includes(t.status)
                          ) : 
                          openTickets
                      )}
                    </TabsContent>
                    
                    <TabsContent value="closed" className="mt-0">
                      {renderTicketsTable(
                        searchQuery ? 
                          filteredTickets.filter(t => 
                            [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(t.status)
                          ) : 
                          closedTickets
                      )}
                    </TabsContent>
                    
                    <TabsContent value="all" className="mt-0">
                      {renderTicketsTable(
                        searchQuery ? filteredTickets : tickets
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
            
            <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
              <div>
                Need immediate assistance? <Link href="/help/contact" className="text-blue-600 hover:underline">Contact us</Link> directly.
              </div>
              <div className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
                View our <Link href="/help/documentation" className="text-blue-600 hover:underline mx-1">Documentation</Link> for self-help resources.
              </div>
            </div>
          </div>
        );
    }
  };
  
  return renderContent();
}