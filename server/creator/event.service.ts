/**
 * Creator audit trail. `logCreatorEvent` appends an immutable row to
 * `creatorEvents`. Fire-and-forget: a failed audit write is logged but never
 * propagates, so it can't break the business operation it was recording
 * (same contract as `writeAuditLog`). Events are append-only — never updated.
 */
import { randomBytes } from "node:crypto";
import { connectMongo } from "@/server/db/mongo";
import { logger } from "@/server/lib/logger";
import { CreatorEventModel } from "@/server/db/creator-models";
import type {
  CreatorEvent,
  CreatorEventActorType,
  CreatorEventEntityType,
} from "@/server/creator/types";

export interface LogCreatorEventInput {
  entityType: CreatorEventEntityType;
  entityId: string;
  actorType: CreatorEventActorType;
  actorId?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}

export async function logCreatorEvent(
  input: LogCreatorEventInput,
): Promise<void> {
  try {
    await connectMongo();
    const event: CreatorEvent = {
      id: `cev_${randomBytes(8).toString("hex")}`,
      entityType: input.entityType,
      entityId: input.entityId,
      actorType: input.actorType,
      actorId: input.actorId,
      eventType: input.eventType,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    };
    await CreatorEventModel.create({ _id: event.id, ...event });
  } catch (err) {
    logger.warn(
      { err, eventType: input.eventType, entityId: input.entityId },
      "creator-event.write-failed",
    );
  }
}
