import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function audit(
  actorId: number | null,
  action: string,
  entity: string,
  entityId?: string | number | null,
  details?: Record<string, unknown>,
) {
  await db.insert(auditLogs).values({
    actorId,
    action,
    entity,
    entityId: entityId == null ? null : String(entityId),
    details: details ?? null,
  });
}
