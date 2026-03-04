import type { PrismaClient } from "@/generated/prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type AuditEntityType = "LICENSE" | "EMPLOYEE" | "ASSIGNMENT" | "SEAT" | "ORG_UNIT" | "USER";

export type AuditAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "REVOKED"
  | "IMPORTED"
  | "MEMBER_OFFBOARD"
  | "MEMBER_MOVED"
  | "RENEWAL_STATUS_CHANGED"
  | "PASSWORD_RESET";

export async function writeAuditLog(
  tx: Tx,
  entry: {
    entityType: AuditEntityType;
    entityId: number;
    action: AuditAction;
    actor?: string;
    actorType?: "USER" | "SYSTEM";
    actorId?: number;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actor: entry.actor ?? null,
      actorType: entry.actorType ?? "USER",
      actorId: entry.actorId ?? null,
      details: entry.details ? JSON.stringify(entry.details) : null,
    },
  });
}
