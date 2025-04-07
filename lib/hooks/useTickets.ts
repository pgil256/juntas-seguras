'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  SupportTicket, 
  TicketStatus, 
  TicketPriority, 
  TicketCategory,
  CreateTicketRequest,
  UpdateTicketRequest,
  AddResponseRequest,
  TicketStats
} from '../../types/support';

interface UseTicketsProps {
  userId?: string;
  ticketId?: string;
  initialData?: SupportTicket[];
}

interface UseTicketsReturn {
  tickets: SupportTicket[];
  isLoading: boolean;
  error: string | null;
  stats: TicketStats | null;
  selectedTicket: SupportTicket | null;
  createTicket: (data: CreateTicketRequest) => Promise<{success: boolean; ticketId?: string; error?: string}>;
  updateTicket: (data: UpdateTicketRequest) => Promise<{success: boolean; ticket?: SupportTicket; error?: string}>;
  addResponse: (data: AddResponseRequest) => Promise<{success: boolean; ticket?: SupportTicket; error?: string}>;
  getTicket: (id: string) => Promise<{success: boolean; ticket?: SupportTicket; error?: string}>;
  refreshTickets: () => Promise<void>;
  fetchStats: () => Promise<void>;
}

export function useTickets({ userId, ticketId, initialData }: UseTicketsProps = {}): UseTicketsReturn {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialData || []);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Fetch tickets based on current filters
  const fetchTickets = useCallback(async () => {
    if (!userId && !ticketId) return; // Don't fetch without filters
    
    setIsLoading(true);
    setError(null);
    
    try {
      let url = '/api/support/tickets';
      const params = new URLSearchParams();
      
      if (userId) params.append('userId', userId);
      if (ticketId) params.append('ticketId', ticketId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tickets');
      }
      
      if (ticketId && data.ticket) {
        setSelectedTicket(data.ticket);
      } else if (data.tickets) {
        setTickets(data.tickets);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching tickets');
      console.error('Error fetching tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, ticketId]);

  // Fetch statistics (for admin dashboard)
  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/support/tickets?stats=true', {
        headers: {
          'x-admin-key': 'admin-secret' // In a real app, this would be a proper authentication token
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch ticket statistics');
      }
      
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching ticket statistics');
      console.error('Error fetching ticket stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new ticket
  const createTicket = async (data: CreateTicketRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create ticket');
      }
      
      // If we're viewing user tickets, refresh the list
      if (userId) {
        await fetchTickets();
      }
      
      return { 
        success: true, 
        ticketId: result.ticketId 
      };
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
      console.error('Error creating ticket:', err);
      return { 
        success: false, 
        error: err.message 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Update ticket status, priority, or assignment
  const updateTicket = async (data: UpdateTicketRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'admin-secret' // In a real app, this would be a proper authentication token
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update ticket');
      }
      
      // If we're viewing the updated ticket, update it in state
      if (selectedTicket && selectedTicket.id === data.ticketId) {
        setSelectedTicket(result.ticket);
      }
      
      // If we're viewing a list that includes this ticket, refresh the list
      if (tickets.some(t => t.id === data.ticketId)) {
        await fetchTickets();
      }
      
      return { 
        success: true, 
        ticket: result.ticket 
      };
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket');
      console.error('Error updating ticket:', err);
      return { 
        success: false, 
        error: err.message 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Add a response to a ticket
  const addResponse = async (data: AddResponseRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Attach user ID if it exists
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (userId) {
        headers['user-id'] = userId;
      }
      
      // If response is from support, add admin key
      if (data.fromSupport) {
        headers['x-admin-key'] = 'admin-secret'; // In a real app, this would be a proper authentication token
      }
      
      const response = await fetch('/api/support/tickets', {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add response');
      }
      
      // If we're viewing the updated ticket, update it in state
      if (selectedTicket && selectedTicket.id === data.ticketId) {
        setSelectedTicket(result.ticket);
      }
      
      // If we're viewing a list that includes this ticket, refresh the list
      if (tickets.some(t => t.id === data.ticketId)) {
        await fetchTickets();
      }
      
      return { 
        success: true, 
        ticket: result.ticket 
      };
    } catch (err: any) {
      setError(err.message || 'Failed to add response');
      console.error('Error adding response:', err);
      return { 
        success: false, 
        error: err.message 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Get a specific ticket by ID
  const getTicket = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const headers: Record<string, string> = {};
      
      // If user ID exists, add it for authorization
      if (userId) {
        headers['user-id'] = userId;
      }
      
      const response = await fetch(`/api/support/tickets?ticketId=${id}`, {
        headers
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch ticket');
      }
      
      setSelectedTicket(result.ticket);
      
      return { 
        success: true, 
        ticket: result.ticket 
      };
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ticket');
      console.error('Error fetching ticket:', err);
      return { 
        success: false, 
        error: err.message 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (!initialData && (userId || ticketId)) {
      fetchTickets();
    }
  }, [fetchTickets, initialData, userId, ticketId]);

  return {
    tickets,
    isLoading,
    error,
    stats,
    selectedTicket,
    createTicket,
    updateTicket,
    addResponse,
    getTicket,
    refreshTickets: fetchTickets,
    fetchStats
  };
}