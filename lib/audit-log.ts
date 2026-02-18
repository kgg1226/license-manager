import type { PrismaClient } from "@/generated/prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type AuditEntityType = "LICENSE" | "EMPLOYEE" | "ASSIGNMENT" | "SEAT";

export type AuditAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "REVOKED"
  | "IMPORTED";

export async function writeAuditLog(
  tx: Tx,
  entry: {
    entityType: AuditEntityType;
    entityId: number;
    action: AuditAction;
    actor?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actor: entry.actor ?? null,
      details: entry.details ? JSON.stringify(entry.details) : null,
    },
  });
}
