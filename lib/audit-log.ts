import type { PrismaClient } from "@/generated/prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type AuditEntityType = "LICENSE" | "EMPLOYEE" | "ASSIGNMENT" | "SEAT" | "ORG_UNIT" | "ORG_COMPANY" | "GROUP" | "USER" | "ASSET" | "ARCHIVE" | "ASSET_CATEGORY" | "EXCHANGE_RATE";

export type AuditAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "RETURNED"
  | "REVOKED"
  | "IMPORTED"
  | "MEMBER_OFFBOARD"
  | "MEMBER_MOVED"
  | "MEMBER_ADDED"
  | "MEMBER_REMOVED"
  | "OWNER_ADDED"
  | "OWNER_REMOVED"
  | "RENEWAL_STATUS_CHANGED"
  | "RENEWAL_DATE_SET"
  | "PASSWORD_RESET"
  | "ASSET_ASSIGNED"
  | "ASSET_UNASSIGNED"
  | "STATUS_CHANGED"
  | "AUTO_DISPOSAL_CHECK";

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
