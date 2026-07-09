/**
 * Server-side audit logging.
 *
 * Writes an AuditLog document directly to the database. Use this from code that
 * has no HTTP session to POST /api/audit/log — webhooks, cron jobs, background
 * handlers, and money-touching route logic that shouldn't depend on a fetch
 * round-trip. Best-effort: it logs and swallows errors so an audit failure
 * never breaks the primary operation.
 *
 * (The client-side/browser path continues to use lib/audit.ts → /api/audit/log.)
 */

import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from './db/connect';
import getAuditLogModel from './db/models/auditLog';
import { AuditLogType } from '../types/audit';

export interface ServerAuditParams {
  userId: string;
  userEmail?: string;
  type: AuditLogType;
  action: string;
  metadata?: Record<string, unknown>;
  poolId?: string;
  success?: boolean;
  errorMessage?: string;
  ip?: string;
  userAgent?: string;
}

export async function writeServerAuditLog(params: ServerAuditParams): Promise<void> {
  try {
    await connectToDatabase();
    const AuditLog = getAuditLogModel();
    await AuditLog.create({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userId: params.userId,
      userEmail: params.userEmail,
      type: params.type,
      action: params.action,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: params.metadata || {},
      poolId: params.poolId,
      success: params.success !== undefined ? params.success : true,
      errorMessage: params.errorMessage,
    });
  } catch (error) {
    console.error('Failed to write server audit log:', error);
  }
}
