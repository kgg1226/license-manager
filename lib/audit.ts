import { prisma } from "@/lib/prisma";

export type AuditEntityType =
  | "LICENSE"
  | "EMPLOYEE"
  | "ASSIGNMENT"
  | "SEAT"
  | "DOCUMENT"
  | "REPORT"
  | "AUTH";

export type AuditAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "REVOKED"
  | "IMPORTED"
  | "DOCUMENT_UPLOAD"
  | "DOCUMENT_VIEW"
  | "DOCUMENT_DELETE"
  | "RENEWAL_PROCESSED"
  | "LOGIN"
  | "LOGOUT";

/**
 * Unified audit logging helper.
 *
 * Unlike `lib/audit-log.ts` which requires a Prisma transaction handle,
 * this function writes directly via the global prisma client so it can
 * be called from any context.  Callers that already run inside a
 * transaction should use the transaction-aware variant instead.
 */
export async function writeAuditLog(
  entityType: AuditEntityType,
  entityId: number,
  action: AuditAction,
  actor?: string | null,
  details?: Record<string, unknown> | null,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      actor: actor ?? null,
      details: details ? JSON.stringify(details) : null,
    },
  });
}
