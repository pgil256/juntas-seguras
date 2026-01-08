import { NextRequest, NextResponse } from 'next/server';
import { 
  SupportTicket, 
  TicketStatus, 
  TicketPriority, 
  TicketCategory,
  CreateTicketRequest,
  UpdateTicketRequest,
  AddResponseRequest,
  TicketStats
} from '../../../../types/support';

// In-memory ticket store (would be a database in production)
const ticketsStore = new Map<string, SupportTicket>();

// Support staff list (would be from a database in production)
const supportStaff = [
  { id: 'staff1', name: 'Support Team', email: 'juntassegurasservice@gmail.com' },
];

// GET /api/support/tickets - Get all tickets or a specific ticket if ticketId is provided
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticketId = searchParams.get('ticketId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const statsOnly = searchParams.get('stats') === 'true';
    
    // Check if user is authorized (for admin access)
    const isAdmin = request.headers.get('x-admin-key') === 'admin-secret';
    
    // If stats requested, return ticket statistics (admin only)
    if (statsOnly && isAdmin) {
      return NextResponse.json(getTicketStats());
    }
    
    // If ticket ID is provided, return that specific ticket
    if (ticketId) {
      const ticket = ticketsStore.get(ticketId);
      
      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        );
      }
      
      // Check if user is authorized to view this ticket
      if (!isAdmin && userId && ticket.userId !== userId) {
        return NextResponse.json(
          { error: 'Not authorized to view this ticket' },
          { status: 403 }
        );
      }
      
      return NextResponse.json({ ticket });
    }
    
    // If user ID is provided, return only that user's tickets
    if (userId && !isAdmin) {
      const userTickets = Array.from(ticketsStore.values())
        .filter(ticket => ticket.userId === userId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      return NextResponse.json({ tickets: userTickets });
    }
    
    // For admin, return all tickets (with optional status filter)
    if (isAdmin) {
      let tickets = Array.from(ticketsStore.values());
      
      // Apply status filter if provided
      if (status) {
        tickets = tickets.filter(ticket => ticket.status === status);
      }
      
      // Sort by updated date (most recent first)
      tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      return NextResponse.json({ 
        tickets,
        supportStaff
      });
    }
    
    // If no authorized access, return error
    return NextResponse.json(
      { error: 'Not authorized to access tickets' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// POST /api/support/tickets - Create a new support ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateTicketRequest;
    const { userId, name, email, subject, message, category, priority } = body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Generate a unique ticket ID
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    
    // Create the ticket
    const newTicket: SupportTicket = {
      id: ticketId,
      userId: userId || undefined,
      userName: name,
      userEmail: email,
      subject: subject || 'Support Request',
      message,
      category: validateCategory(category),
      priority: validatePriority(priority),
      status: TicketStatus.OPEN,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: []
    };
    
    // In a real app, we would also handle file uploads for attachments here
    
    // Save the ticket
    ticketsStore.set(ticketId, newTicket);
    
    // Send email notification (for production)
    await sendEmailNotification({
      type: 'new_ticket',
      ticket: newTicket
    });
    
    // Return the created ticket
    return NextResponse.json({
      success: true,
      message: 'Support ticket created successfully',
      ticketId,
      ticket: newTicket
    });
  } catch (error) {
    console.error('Support ticket creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create support ticket. Please try again later.' },
      { status: 500 }
    );
  }
}

// PATCH /api/support/tickets - Update a ticket's status, priority, or assign staff
export async function PATCH(request: NextRequest) {
  try {
    // Check if user is authorized (admin only)
    const isAdmin = request.headers.get('x-admin-key') === 'admin-secret';
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to update tickets' },
        { status: 403 }
      );
    }
    
    const body = await request.json() as UpdateTicketRequest;
    const { ticketId, status, priority, assignedTo } = body;
    
    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }
    
    // Get the ticket
    const ticket = ticketsStore.get(ticketId);
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }
    
    // Update the ticket
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo || undefined;
    
    // Update the timestamp
    ticket.updatedAt = new Date().toISOString();
    
    // Save the updated ticket
    ticketsStore.set(ticketId, ticket);
    
    // Send email notification for status change
    if (status) {
      await sendEmailNotification({
        type: 'ticket_updated',
        ticket,
        update: { field: 'status', value: status }
      });
    }
    
    // Return the updated ticket
    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Ticket update error:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket. Please try again later.' },
      { status: 500 }
    );
  }
}

// Add endpoint to add a response to a ticket
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as AddResponseRequest;
    const { ticketId, message, fromSupport, userName } = body;
    
    // Validate required fields
    if (!ticketId || !message || userName === undefined) {
      return NextResponse.json(
        { error: 'Ticket ID, message, and user name are required' },
        { status: 400 }
      );
    }
    
    // Get the ticket
    const ticket = ticketsStore.get(ticketId);
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }
    
    // Check if user is authorized
    const isAdmin = request.headers.get('x-admin-key') === 'admin-secret';
    const userId = request.headers.get('user-id');
    
    if (fromSupport && !isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to respond as support' },
        { status: 403 }
      );
    }
    
    if (!fromSupport && userId && ticket.userId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to respond to this ticket' },
        { status: 403 }
      );
    }
    
    // Generate response ID
    const responseId = `RES-${Date.now().toString(36).toUpperCase()}`;
    
    // Create the response
    const response = {
      id: responseId,
      ticketId,
      message,
      fromSupport,
      userName,
      createdAt: new Date().toISOString()
    };
    
    // Add response to ticket
    if (!ticket.responses) {
      ticket.responses = [];
    }
    
    ticket.responses.push(response);
    
    // Update ticket status based on who responded
    if (fromSupport) {
      ticket.status = TicketStatus.WAITING;
    } else {
      ticket.status = TicketStatus.OPEN;
    }
    
    ticket.updatedAt = new Date().toISOString();
    
    // Save the updated ticket
    ticketsStore.set(ticketId, ticket);
    
    // Send email notification
    await sendEmailNotification({
      type: fromSupport ? 'support_response' : 'user_response',
      ticket,
      response
    });
    
    // Return the updated ticket
    return NextResponse.json({
      success: true,
      message: 'Response added successfully',
      ticket
    });
  } catch (error) {
    console.error('Add response error:', error);
    return NextResponse.json(
      { error: 'Failed to add response. Please try again later.' },
      { status: 500 }
    );
  }
}

// Helper function to validate category
function validateCategory(category: string): TicketCategory {
  try {
    return category as TicketCategory;
  } catch {
    return TicketCategory.GENERAL;
  }
}

// Helper function to validate priority
function validatePriority(priority: string): TicketPriority {
  try {
    return priority as TicketPriority;
  } catch {
    return TicketPriority.NORMAL;
  }
}

// Helper function to get ticket statistics
function getTicketStats(): TicketStats {
  const tickets = Array.from(ticketsStore.values());
  
  const stats: TicketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === TicketStatus.OPEN).length,
    inProgress: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
    waiting: tickets.filter(t => t.status === TicketStatus.WAITING).length,
    resolved: tickets.filter(t => t.status === TicketStatus.RESOLVED).length,
    closed: tickets.filter(t => t.status === TicketStatus.CLOSED).length,
    byCategory: {},
    byPriority: {}
  };
  
  // Count by category
  tickets.forEach(ticket => {
    const categoryCount = stats.byCategory[ticket.category] || 0;
    stats.byCategory[ticket.category] = categoryCount + 1;
    
    const priorityCount = stats.byPriority[ticket.priority] || 0;
    stats.byPriority[ticket.priority] = priorityCount + 1;
  });
  
  return stats;
}

// Helper function to send email notifications
async function sendEmailNotification(params: {
  type: 'new_ticket' | 'ticket_updated' | 'support_response' | 'user_response';
  ticket: SupportTicket;
  update?: { field: string; value: any };
  response?: any;
}) {
  // In a real app, this would send actual emails using nodemailer
  // For development, we just log the notification details
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Email notification would be sent in production:');
    console.log('Type:', params.type);
    console.log('Ticket ID:', params.ticket.id);
    console.log('Recipient:', params.type.includes('support') 
      ? params.ticket.userEmail
      : 'juntassegurasservice@gmail.com');
  }
  
  // In production:
  // 1. Format appropriate email content based on notification type
  // 2. Send email using nodemailer or email service API
  
  return true;
}