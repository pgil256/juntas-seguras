export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING = 'waiting',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum TicketPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TicketCategory {
  GENERAL = 'general',
  ACCOUNT = 'account',
  POOL = 'pool',
  PAYMENT = 'payment',
  TECHNICAL = 'technical',
  FEEDBACK = 'feedback',
  SECURITY = 'security'
}

export interface SupportTicket {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  assignedTo?: string; // Support staff ID
  attachments?: string[]; // URLs to attachment files
  responses?: TicketResponse[];
}

export interface TicketResponse {
  id: string;
  ticketId: string;
  message: string;
  fromSupport: boolean; // true if from support staff, false if from user
  userName: string;
  createdAt: string; // ISO date string
  attachments?: string[]; // URLs to attachment files
}

export interface CreateTicketRequest {
  userId?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  attachments?: File[];
}

export interface UpdateTicketRequest {
  ticketId: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
}

export interface AddResponseRequest {
  ticketId: string;
  message: string;
  fromSupport: boolean;
  userName: string;
  attachments?: File[];
}

export interface SupportCategory {
  value: string;
  label: string;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  closed: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}