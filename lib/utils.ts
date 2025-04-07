import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from 'uuid';
import { ActivityType, ActivityLog } from '@/types/security';

// For server-side local storage of logs (memory store for development)
const activityLogs: ActivityLog[] = [];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to a readable string format
 * @param date - The date to format
 * @returns Formatted date string (e.g., "January 12, 2025")
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getInitials(name: string = ''): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Activity logging for server components
export function logServerActivity(userId: string, type: ActivityType, metadata: any = {}) {
  try {
    // Create the activity log entry
    const activityLog: ActivityLog = {
      id: uuidv4(),
      userId,
      type,
      timestamp: new Date().toISOString(),
      ipAddress: '127.0.0.1', // Default for server-side
      metadata,
    };

    // In a real app, this would save to a database
    activityLogs.unshift(activityLog); // Add to the beginning for chronological order
    
    // Keep logs manageable for this example
    if (activityLogs.length > 1000) {
      activityLogs.pop();
    }
    
    return activityLog;
  } catch (error) {
    console.error('Activity log error:', error);
    return null;
  }
}

// Get activity logs
export function getActivityLogs(userId: string, page = 1, limit = 20, type?: ActivityType) {
  try {
    // Filter logs by user ID and optionally by type
    let filteredLogs = activityLogs.filter(log => log.userId === userId);
    
    if (type) {
      filteredLogs = filteredLogs.filter(log => log.type === type);
    }

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const totalItems = filteredLogs.length;
    const totalPages = Math.ceil(totalItems / limit);
    
    // Get the paginated logs
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    return {
      logs: paginatedLogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      }
    };
  } catch (error) {
    console.error('Activity log fetch error:', error);
    return {
      logs: [],
      pagination: {
        currentPage: page,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limit
      }
    };
  }
}