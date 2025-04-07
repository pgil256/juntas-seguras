'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Send, 
  Calendar, 
  Tag, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  MailCheck, 
  Loader2, 
  MessageSquare,
  FileText,
  User,
  ChevronLeft,
  HelpCircle,
  DownloadCloud
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';
import { SupportTicket, TicketStatus, TicketPriority, TicketResponse } from '../../types/support';
import { useTickets } from '../../lib/hooks/useTickets';

interface TicketViewerProps {
  ticketId: string;
  userId?: string;
  isAdmin?: boolean;
  onBack?: () => void;
}

export default function TicketViewer({ 
  ticketId, 
  userId,
  isAdmin = false,
  onBack
}: TicketViewerProps) {
  const [newResponse, setNewResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    selectedTicket,
    isLoading,
    error,
    getTicket,
    updateTicket,
    addResponse
  } = useTickets({ ticketId, userId });

  // Load ticket on component mount
  useState(() => {
    getTicket(ticketId);
  });

  // Status badge styles
  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case TicketStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case TicketStatus.WAITING:
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case TicketStatus.RESOLVED:
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case TicketStatus.CLOSED:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Priority badge styles
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
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  // Handle status change (admin only)
  const handleStatusChange = async (status: string) => {
    if (!selectedTicket || !isAdmin) return;
    
    const result = await updateTicket({
      ticketId: selectedTicket.id,
      status: status as TicketStatus
    });
    
    if (!result.success) {
      console.error('Failed to update status:', result.error);
    }
  };

  // Handle priority change (admin only)
  const handlePriorityChange = async (priority: string) => {
    if (!selectedTicket || !isAdmin) return;
    
    const result = await updateTicket({
      ticketId: selectedTicket.id,
      priority: priority as TicketPriority
    });
    
    if (!result.success) {
      console.error('Failed to update priority:', result.error);
    }
  };

  // Send a new response
  const handleSendResponse = async () => {
    if (!selectedTicket || !newResponse.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const result = await addResponse({
        ticketId: selectedTicket.id,
        message: newResponse,
        fromSupport: isAdmin,
        userName: isAdmin ? 'Support Team' : selectedTicket.userName
      });
      
      if (result.success) {
        setNewResponse('');
      } else {
        console.error('Failed to send response:', result.error);
      }
    } catch (err) {
      console.error('Error sending response:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex justify-center items-center min-h-[300px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Loading ticket information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !selectedTicket) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Ticket not found'}
            </AlertDescription>
          </Alert>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="mt-4">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="absolute left-4 top-4 p-2 h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        
        <div className="flex justify-between items-start mt-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge 
                className={getPriorityBadge(selectedTicket.priority)}
                variant="outline"
              >
                {selectedTicket.priority.toUpperCase()}
              </Badge>
              
              {isAdmin ? (
                <Select 
                  value={selectedTicket.status} 
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className={`w-[130px] h-7 text-xs ${getStatusBadge(selectedTicket.status)}`}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TicketStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge 
                  className={getStatusBadge(selectedTicket.status)}
                  variant="outline"
                >
                  {formatStatus(selectedTicket.status)}
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl">{selectedTicket.subject}</CardTitle>
            <CardDescription className="mt-1">
              <span className="flex items-center gap-1 text-sm">
                <Tag className="h-3 w-3" />
                Ticket ID: {selectedTicket.id}
              </span>
            </CardDescription>
          </div>
          
          {isAdmin && (
            <div className="flex flex-col items-end">
              <div className="mb-2">
                <Select 
                  value={selectedTicket.priority} 
                  onValueChange={handlePriorityChange}
                >
                  <SelectTrigger className="w-[120px] text-sm">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TicketPriority).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created: {formatDate(selectedTicket.createdAt)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between mb-4 text-sm text-muted-foreground">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="font-medium">From:</span> {selectedTicket.userName} ({selectedTicket.userEmail})
            </div>
            
            <div className="flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              <span className="font-medium">Category:</span> {selectedTicket.category.charAt(0).toUpperCase() + selectedTicket.category.slice(1)}
            </div>
          </div>
          
          {!isAdmin && (
            <div className="space-y-1 mt-2 sm:mt-0 sm:text-right">
              <div className="flex items-center gap-1 sm:justify-end">
                <Calendar className="h-3 w-3" />
                <span className="font-medium">Created:</span> {formatDate(selectedTicket.createdAt)}
              </div>
              
              <div className="flex items-center gap-1 sm:justify-end">
                <Clock className="h-3 w-3" />
                <span className="font-medium">Updated:</span> {formatDate(selectedTicket.updatedAt)}
              </div>
            </div>
          )}
        </div>
        
        <Separator className="my-4" />
        
        {/* Original message */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{selectedTicket.userName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{selectedTicket.userName}</div>
              <div className="text-xs text-muted-foreground">{formatDate(selectedTicket.createdAt)}</div>
            </div>
          </div>
          
          <div className="pl-10 pr-4 pb-2">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-line">{selectedTicket.message}</p>
            </div>
            
            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium">Attachments:</p>
                <div className="space-y-1">
                  {selectedTicket.attachments.map((attachment, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm flex-1 truncate">{attachment.split('/').pop()}</span>
                      <Button size="sm" variant="ghost" className="h-7 px-2">
                        <DownloadCloud className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Responses */}
        {selectedTicket.responses && selectedTicket.responses.length > 0 && (
          <div className="space-y-5 mb-6">
            <Separator />
            {selectedTicket.responses.map((response: TicketResponse) => (
              <div key={response.id} className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-8 w-8">
                    {response.fromSupport ? (
                      <AvatarImage src="/support-avatar.png" alt="Support" />
                    ) : null}
                    <AvatarFallback>
                      {response.fromSupport ? 'S' : response.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium flex items-center">
                      {response.userName}
                      {response.fromSupport && (
                        <Badge variant="outline" className="ml-2 text-xs bg-blue-50">
                          Support Team
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(response.createdAt)}</div>
                  </div>
                </div>
                
                <div className="pl-10 pr-4 pb-2">
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-line">{response.message}</p>
                  </div>
                  
                  {response.attachments && response.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Attachments:</p>
                      <div className="space-y-1">
                        {response.attachments.map((attachment, i) => (
                          <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="text-sm flex-1 truncate">{attachment.split('/').pop()}</span>
                            <Button size="sm" variant="ghost" className="h-7 px-2">
                              <DownloadCloud className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Only show response box if ticket is not closed/resolved */}
        {selectedTicket.status !== TicketStatus.CLOSED && selectedTicket.status !== TicketStatus.RESOLVED && (
          <div className="mt-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Add a response
              </h3>
              <Textarea
                placeholder="Type your message here..."
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                rows={4}
                className="resize-none mb-3"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSendResponse} 
                  disabled={isSubmitting || !newResponse.trim()} 
                  className="flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Response
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Closed or resolved ticket notice */}
        {(selectedTicket.status === TicketStatus.CLOSED || selectedTicket.status === TicketStatus.RESOLVED) && (
          <Alert className="mt-6 bg-gray-50">
            {selectedTicket.status === TicketStatus.RESOLVED ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  This ticket has been marked as resolved. If you need further assistance, please create a new ticket or reopen this one.
                </AlertDescription>
              </>
            ) : (
              <>
                <MailCheck className="h-4 w-4 text-blue-500" />
                <AlertDescription>
                  This ticket has been closed. If you have a similar issue, please create a new support ticket.
                </AlertDescription>
              </>
            )}
          </Alert>
        )}
      </CardContent>
      
      <CardFooter>
        <div className="w-full flex justify-between items-center text-sm text-gray-500">
          <span>
            Last updated: {formatDate(selectedTicket.updatedAt)}
          </span>
          {isAdmin && selectedTicket.assignedTo && (
            <span>
              Assigned to: {selectedTicket.assignedTo}
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}