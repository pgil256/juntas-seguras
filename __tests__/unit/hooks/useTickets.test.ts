/**
 * Unit tests for lib/hooks/useTickets.ts
 * Tests support ticket management functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTickets } from '@/lib/hooks/useTickets';
import {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  SupportTicket,
  TicketStats,
} from '@/types/support';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useTickets', () => {
  const mockTicket: SupportTicket = {
    id: 'ticket-123',
    userId: 'user-123',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    subject: 'Test Issue',
    message: 'This is a test ticket',
    category: TicketCategory.TECHNICAL,
    priority: TicketPriority.NORMAL,
    status: TicketStatus.OPEN,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    responses: [],
  };

  const mockTickets: SupportTicket[] = [
    mockTicket,
    {
      ...mockTicket,
      id: 'ticket-456',
      subject: 'Another Issue',
      status: TicketStatus.IN_PROGRESS,
    },
  ];

  const mockStats: TicketStats = {
    total: 100,
    open: 30,
    inProgress: 25,
    waiting: 15,
    resolved: 20,
    closed: 10,
    byCategory: {
      technical: 40,
      account: 30,
      payment: 20,
      general: 10,
    },
    byPriority: {
      urgent: 10,
      high: 20,
      normal: 50,
      low: 20,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    it('should return initial state with empty tickets', () => {
      const { result } = renderHook(() => useTickets());

      expect(result.current.tickets).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.stats).toBeNull();
      expect(result.current.selectedTicket).toBeNull();
    });

    it('should use initialData when provided', () => {
      const { result } = renderHook(() =>
        useTickets({ initialData: mockTickets })
      );

      expect(result.current.tickets).toEqual(mockTickets);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not fetch without filters', () => {
      renderHook(() => useTickets());

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Fetching Tickets', () => {
    it('should fetch tickets for user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: mockTickets }),
      } as Response);

      const { result } = renderHook(() => useTickets({ userId: 'user-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/support/tickets?userId=user-123');
      expect(result.current.tickets).toEqual(mockTickets);
    });

    it('should fetch single ticket by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticket: mockTicket }),
      } as Response);

      const { result } = renderHook(() => useTickets({ ticketId: 'ticket-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/support/tickets?ticketId=ticket-123');
      expect(result.current.selectedTicket).toEqual(mockTicket);
    });

    it('should fetch tickets for admin', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: mockTickets }),
      } as Response);

      const { result } = renderHook(() => useTickets({ isAdmin: true }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/support/tickets?isAdmin=true');
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response);

      const { result } = renderHook(() => useTickets({ userId: 'user-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Unauthorized');
      expect(result.current.tickets).toEqual([]);
    });
  });

  describe('Creating Tickets', () => {
    it('should create ticket successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticketId: 'new-ticket-123' }),
      } as Response);

      const { result } = renderHook(() => useTickets());

      let createResult: { success: boolean; ticketId?: string; error?: string };
      await act(async () => {
        createResult = await result.current.createTicket({
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'New Issue',
          message: 'This is a new issue',
          category: 'technical',
          priority: 'normal',
        });
      });

      expect(createResult!.success).toBe(true);
      expect(createResult!.ticketId).toBe('new-ticket-123');
      expect(mockFetch).toHaveBeenCalledWith('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      });
    });

    it('should refresh tickets after creating when userId is set', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: mockTickets }),
      } as Response);

      const { result } = renderHook(() => useTickets({ userId: 'user-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create ticket
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticketId: 'new-ticket-123' }),
      } as Response);

      // Refresh after create
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: [...mockTickets, { ...mockTicket, id: 'new-ticket-123' }] }),
      } as Response);

      await act(async () => {
        await result.current.createTicket({
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'New Issue',
          message: 'This is a new issue',
          category: 'technical',
          priority: 'normal',
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle create ticket error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation error' }),
      } as Response);

      const { result } = renderHook(() => useTickets());

      let createResult: { success: boolean; ticketId?: string; error?: string };
      await act(async () => {
        createResult = await result.current.createTicket({
          name: '',
          email: 'invalid',
          subject: '',
          message: '',
          category: 'technical',
          priority: 'normal',
        });
      });

      expect(createResult!.success).toBe(false);
      expect(createResult!.error).toBe('Validation error');
    });
  });

  describe('Updating Tickets', () => {
    it('should update ticket status successfully', async () => {
      const updatedTicket = { ...mockTicket, status: TicketStatus.RESOLVED };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticket: updatedTicket }),
      } as Response);

      const { result } = renderHook(() => useTickets());

      let updateResult: { success: boolean; ticket?: SupportTicket; error?: string };
      await act(async () => {
        updateResult = await result.current.updateTicket({
          ticketId: 'ticket-123',
          status: TicketStatus.RESOLVED,
        });
      });

      expect(updateResult!.success).toBe(true);
      expect(updateResult!.ticket?.status).toBe(TicketStatus.RESOLVED);
      expect(mockFetch).toHaveBeenCalledWith('/api/support/tickets', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'admin-secret',
        },
        body: JSON.stringify({
          ticketId: 'ticket-123',
          status: TicketStatus.RESOLVED,
        }),
      });
    });

    it('should update selected ticket when viewing it', async () => {
      // Initial fetch to set selectedTicket
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticket: mockTicket }),
      } as Response);

      const { result } = renderHook(() => useTickets({ ticketId: 'ticket-123' }));

      await waitFor(() => {
        expect(result.current.selectedTicket).toEqual(mockTicket);
      });

      // Update ticket
      const updatedTicket = { ...mockTicket, status: TicketStatus.IN_PROGRESS };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticket: updatedTicket }),
      } as Response);

      await act(async () => {
        await result.current.updateTicket({
          ticketId: 'ticket-123',
          status: TicketStatus.IN_PROGRESS,
        });
      });

      expect(result.current.selectedTicket?.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it('should handle update error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Ticket not found' }),
      } as Response);

      const { result } = renderHook(() => useTickets());

      let updateResult: { success: boolean; ticket?: SupportTicket; error?: string };
      await act(async () => {
        updateResult = await result.current.updateTicket({
          ticketId: 'invalid-id',
          status: TicketStatus.CLOSED,
        });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Ticket not found');
    });
  });

  describe('Adding Responses', () => {
    it('should add response successfully', async () => {
      const ticketWithResponse = {
        ...mockTicket,
        responses: [
          {
            id: 'response-1',
            ticketId: 'ticket-123',
            message: 'Thank you for your help',
            fromSupport: false,
            userName: 'John Doe',
            createdAt: '2024-01-02T00:00:00.000Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticket: ticketWithResponse }),
      } as Response);

      const { result } = renderHook(() => useTickets({ userId: 'user-123' }));

      let responseResult: { success: boolean; ticket?: SupportTicket; error?: string };
      await act(async () => {
        responseResult = await result.current.addResponse({
          ticketId: 'ticket-123',
          message: 'Thank you for your help',
          fromSupport: false,
          userName: 'John Doe',
        });
      });

      expect(responseResult!.success).toBe(true);
      expect(responseResult!.ticket?.responses).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/support/tickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'user-id': 'user-123',
        },
        body: expect.any(String),
      });
    });

    it('should add admin key for support responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticket: mockTicket }),
      } as Response);

      const { result } = renderHook(() => useTickets());

      await act(async () => {
        await result.current.addResponse({
          ticketId: 'ticket-123',
          message: 'We are looking into this',
          fromSupport: true,
          userName: 'Support Agent',
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/support/tickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'admin-secret',
        },
        body: expect.any(String),
      });
    });

    it('should handle add response error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to add response' }),
      } as Response);

      const { result } = renderHook(() => useTickets());

      let responseResult: { success: boolean; ticket?: SupportTicket; error?: string };
      await act(async () => {
        responseResult = await result.current.addResponse({
          ticketId: 'ticket-123',
          message: '',
          fromSupport: false,
          userName: 'John Doe',
        });
      });

      expect(responseResult!.success).toBe(false);
      expect(responseResult!.error).toBe('Failed to add response');
    });
  });

  describe('Get Single Ticket', () => {
    it('should get ticket by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticket: mockTicket }),
      } as Response);

      const { result } = renderHook(() => useTickets({ userId: 'user-123' }));

      let getResult: { success: boolean; ticket?: SupportTicket; error?: string };
      await act(async () => {
        getResult = await result.current.getTicket('ticket-123');
      });

      expect(getResult!.success).toBe(true);
      expect(getResult!.ticket).toEqual(mockTicket);
      expect(result.current.selectedTicket).toEqual(mockTicket);
    });

    it('should handle get ticket error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Ticket not found' }),
      } as Response);

      const { result } = renderHook(() => useTickets());

      let getResult: { success: boolean; ticket?: SupportTicket; error?: string };
      await act(async () => {
        getResult = await result.current.getTicket('invalid-id');
      });

      expect(getResult!.success).toBe(false);
      expect(getResult!.error).toBe('Ticket not found');
    });
  });

  describe('Fetching Stats', () => {
    it('should fetch statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stats: mockStats }),
      } as Response);

      const { result } = renderHook(() => useTickets());

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.stats).toEqual(mockStats);
      expect(mockFetch).toHaveBeenCalledWith('/api/support/tickets?stats=true', {
        headers: {
          'x-admin-key': 'admin-secret',
        },
      });
    });

    it('should handle stats fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response);

      const { result } = renderHook(() => useTickets());

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.error).toBe('Unauthorized');
      expect(result.current.stats).toBeNull();
    });
  });

  describe('Refresh Tickets', () => {
    it('should refresh tickets', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: mockTickets }),
      } as Response);

      const { result } = renderHook(() => useTickets({ userId: 'user-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: [...mockTickets, { ...mockTicket, id: 'new-ticket' }] }),
      } as Response);

      await act(async () => {
        await result.current.refreshTickets();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Return Value Types', () => {
    it('should expose all expected properties and methods', () => {
      const { result } = renderHook(() => useTickets());

      expect(result.current).toHaveProperty('tickets');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('stats');
      expect(result.current).toHaveProperty('selectedTicket');
      expect(result.current).toHaveProperty('createTicket');
      expect(result.current).toHaveProperty('updateTicket');
      expect(result.current).toHaveProperty('addResponse');
      expect(result.current).toHaveProperty('getTicket');
      expect(result.current).toHaveProperty('refreshTickets');
      expect(result.current).toHaveProperty('fetchStats');
      expect(typeof result.current.createTicket).toBe('function');
      expect(typeof result.current.updateTicket).toBe('function');
      expect(typeof result.current.addResponse).toBe('function');
      expect(typeof result.current.getTicket).toBe('function');
      expect(typeof result.current.refreshTickets).toBe('function');
      expect(typeof result.current.fetchStats).toBe('function');
    });
  });

  describe('Error Recovery', () => {
    it('should clear error on successful operation', async () => {
      // First request fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response);

      const { result } = renderHook(() => useTickets({ userId: 'user-123' }));

      await waitFor(() => {
        expect(result.current.error).toBe('Server error');
      });

      // Refresh succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: mockTickets }),
      } as Response);

      await act(async () => {
        await result.current.refreshTickets();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.tickets).toEqual(mockTickets);
    });
  });
});
