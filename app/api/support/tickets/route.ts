import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '../../auth/[...nextauth]/options';
import connectToDatabase from '../../../../lib/db/connect';
import {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  CreateTicketRequest,
  UpdateTicketRequest,
  AddResponseRequest,
  TicketStats,
} from '../../../../types/support';

const supportStaff = [
  { id: 'staff1', name: 'Support Team', email: process.env.EMAIL_USER || 'juntassegurasservice@gmail.com' },
];

async function getTicketsCollection() {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not connected');
  }
  return db.collection<SupportTicket>('supportTickets');
}

async function isSupportAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return false;

  const adminEmails = (process.env.ADMIN_EMAILS || process.env.EMAIL_USER || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email);
}

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return {
    id: session?.user?.id,
    email: session?.user?.email?.toLowerCase(),
    name: session?.user?.name,
  };
}

function canAccessTicket(ticket: SupportTicket, user: { id?: string; email?: string }): boolean {
  return !!(
    (user.id && ticket.userId === user.id) ||
    (user.email && ticket.userEmail.toLowerCase() === user.email)
  );
}

function validateCategory(category: string): TicketCategory {
  return Object.values(TicketCategory).includes(category as TicketCategory)
    ? (category as TicketCategory)
    : TicketCategory.GENERAL;
}

function validatePriority(priority: string): TicketPriority {
  return Object.values(TicketPriority).includes(priority as TicketPriority)
    ? (priority as TicketPriority)
    : TicketPriority.NORMAL;
}

async function getTicketStats(): Promise<TicketStats> {
  const ticketsCollection = await getTicketsCollection();
  const tickets = await ticketsCollection.find({}).toArray();

  return {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === TicketStatus.OPEN).length,
    inProgress: tickets.filter((ticket) => ticket.status === TicketStatus.IN_PROGRESS).length,
    waiting: tickets.filter((ticket) => ticket.status === TicketStatus.WAITING).length,
    resolved: tickets.filter((ticket) => ticket.status === TicketStatus.RESOLVED).length,
    closed: tickets.filter((ticket) => ticket.status === TicketStatus.CLOSED).length,
    byCategory: tickets.reduce<Record<string, number>>((acc, ticket) => {
      acc[ticket.category] = (acc[ticket.category] || 0) + 1;
      return acc;
    }, {}),
    byPriority: tickets.reduce<Record<string, number>>((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {}),
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticketId = searchParams.get('ticketId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const statsOnly = searchParams.get('stats') === 'true';

    const isAdmin = await isSupportAdmin();
    const sessionUser = await getSessionUser();
    const ticketsCollection = await getTicketsCollection();

    if (statsOnly) {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Not authorized to access ticket statistics' }, { status: 403 });
      }
      return NextResponse.json({ stats: await getTicketStats() });
    }

    if (ticketId) {
      const ticket = await ticketsCollection.findOne({ id: ticketId });
      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      if (!isAdmin && !canAccessTicket(ticket, sessionUser)) {
        return NextResponse.json({ error: 'Not authorized to view this ticket' }, { status: 403 });
      }

      return NextResponse.json({ ticket });
    }

    if (isAdmin) {
      const query = status ? { status: status as TicketStatus } : {};
      const tickets = await ticketsCollection.find(query).sort({ updatedAt: -1 }).toArray();
      return NextResponse.json({ tickets, supportStaff });
    }

    if (!sessionUser.id && !sessionUser.email) {
      return NextResponse.json({ error: 'Not authorized to access tickets' }, { status: 403 });
    }

    if (userId && userId !== sessionUser.id) {
      return NextResponse.json({ error: 'Not authorized to access tickets' }, { status: 403 });
    }

    const tickets = await ticketsCollection
      .find({
        $or: [
          ...(sessionUser.id ? [{ userId: sessionUser.id }] : []),
          ...(sessionUser.email ? [{ userEmail: sessionUser.email }] : []),
        ],
      })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateTicketRequest;
    const { name, email, subject, message, category, priority } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const sessionUser = await getSessionUser();
    const now = new Date().toISOString();
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const newTicket: SupportTicket = {
      id: ticketId,
      userId: sessionUser.id || body.userId || undefined,
      userName: name,
      userEmail: email.trim().toLowerCase(),
      subject: subject || 'Support Request',
      message,
      category: validateCategory(category),
      priority: validatePriority(priority),
      status: TicketStatus.OPEN,
      createdAt: now,
      updatedAt: now,
      responses: [],
    };

    const ticketsCollection = await getTicketsCollection();
    await ticketsCollection.insertOne(newTicket);

    await sendEmailNotification({
      type: 'new_ticket',
      ticket: newTicket,
    });

    return NextResponse.json({
      success: true,
      message: 'Support ticket created successfully',
      ticketId,
      ticket: newTicket,
    });
  } catch (error) {
    console.error('Support ticket creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create support ticket. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await isSupportAdmin())) {
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

    const update: Partial<SupportTicket> = { updatedAt: new Date().toISOString() };
    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (assignedTo !== undefined) update.assignedTo = assignedTo || undefined;

    const ticketsCollection = await getTicketsCollection();
    const result = await ticketsCollection.findOneAndUpdate(
      { id: ticketId },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    if (status) {
      await sendEmailNotification({
        type: 'ticket_updated',
        ticket: result,
        update: { field: 'status', value: status },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket: result,
    });
  } catch (error) {
    console.error('Ticket update error:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as AddResponseRequest;
    const { ticketId, message, fromSupport, userName } = body;

    if (!ticketId || !message || userName === undefined) {
      return NextResponse.json(
        { error: 'Ticket ID, message, and user name are required' },
        { status: 400 }
      );
    }

    const ticketsCollection = await getTicketsCollection();
    const ticket = await ticketsCollection.findOne({ id: ticketId });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const isAdmin = await isSupportAdmin();
    const sessionUser = await getSessionUser();

    if (fromSupport && !isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to respond as support' },
        { status: 403 }
      );
    }

    if (!fromSupport && !canAccessTicket(ticket, sessionUser)) {
      return NextResponse.json(
        { error: 'Not authorized to respond to this ticket' },
        { status: 403 }
      );
    }

    const response = {
      id: `RES-${Date.now().toString(36).toUpperCase()}`,
      ticketId,
      message,
      fromSupport,
      userName,
      createdAt: new Date().toISOString(),
    };

    const updatedTicket = await ticketsCollection.findOneAndUpdate(
      { id: ticketId },
      {
        $push: { responses: response },
        $set: {
          status: fromSupport ? TicketStatus.WAITING : TicketStatus.OPEN,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!updatedTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    await sendEmailNotification({
      type: fromSupport ? 'support_response' : 'user_response',
      ticket: updatedTicket,
      response,
    });

    return NextResponse.json({
      success: true,
      message: 'Response added successfully',
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error('Add response error:', error);
    return NextResponse.json(
      { error: 'Failed to add response. Please try again later.' },
      { status: 500 }
    );
  }
}

async function sendEmailNotification(params: {
  type: 'new_ticket' | 'ticket_updated' | 'support_response' | 'user_response';
  ticket: SupportTicket;
  update?: { field: string; value: unknown };
  response?: unknown;
}) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Email notification would be sent in production:', {
      type: params.type,
      ticketId: params.ticket.id,
      recipient: params.type.includes('support')
        ? params.ticket.userEmail
        : process.env.EMAIL_USER || 'juntassegurasservice@gmail.com',
    });
  }

  return true;
}
