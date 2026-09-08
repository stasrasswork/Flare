import { Prisma } from "../../generated/prisma/client.js";
import { conflict, notFound, validationError } from "../../lib/errors.js";
import { prisma, type DbClient } from "../../lib/prisma.js";
import { publishSnapshot } from "../flags/flags.snapshot.js";
import { toFlagStateAuditSnapshot, toRuleInputs, type FlagStateAuditSnapshot } from "../flags/flags.audit.js";
import { getFlag } from "../flags/flags.service.js";
import { auditSnapshotSchemaForType } from "../flags/flags.schema.js";
import { toAuditEventDto, type AuditEventDto } from "./audit.dto.js";

const actorSelect = { id: true, name: true, email: true } as const;

function writeAudit(
  db: DbClient,
  data: {
    workspaceId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
) {
  return db.auditEvent.create({ data });
}

function parseSnapshot(value: unknown, type: "BOOLEAN" | "PERCENTAGE" | "STRING") {
  const result = auditSnapshotSchemaForType(type).safeParse(value);
  if (!result.success) {
    throw validationError(result.error.flatten());
  }
  return result.data as FlagStateAuditSnapshot;
}

async function getFlagStateIds(workspaceId: string, flagId: string, environmentId?: string) {
  const flag = await prisma.flag.findFirst({
    where: { id: flagId, workspaceId },
    select: {
      id: true,
      states: { where: environmentId ? { environmentId } : undefined, select: { id: true } },
    },
  });
  if (!flag) {
    throw notFound("Flag not found");
  }
  if (environmentId && flag.states.length === 0) {
    throw notFound("Environment not found");
  }
  return flag.states.map((state) => state.id);
}

export async function listFlagAuditEvents(params: {
  workspaceId: string;
  flagId: string;
  environmentId?: string;
  limit: number;
  cursor?: string;
}): Promise<{ events: AuditEventDto[]; nextCursor: string | null }> {
  const stateIds = await getFlagStateIds(params.workspaceId, params.flagId, params.environmentId);
  const events = await prisma.auditEvent.findMany({
    where: {
      workspaceId: params.workspaceId,
      entityType: "FlagState",
      entityId: { in: stateIds },
    },
    include: { actor: { select: actorSelect } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    take: params.limit + 1,
  });

  const hasNext = events.length > params.limit;
  const page = hasNext ? events.slice(0, params.limit) : events;
  return {
    events: page.map(toAuditEventDto),
    nextCursor: hasNext ? page.at(-1)?.id ?? null : null,
  };
}

async function replaceRules(db: DbClient, flagStateId: string, snapshot: FlagStateAuditSnapshot) {
  await db.rule.deleteMany({ where: { flagStateId } });
  const rules = toRuleInputs(snapshot);
  if (rules.length === 0) {
    return;
  }
  await db.rule.createMany({
    data: rules.map((rule, order) => ({
      flagStateId,
      type: rule.type,
      order,
      percentage: rule.percentage ?? null,
      userIds: rule.userIds ?? [],
      value: rule.value ?? undefined,
    })),
  });
}

export async function rollbackFlagState(params: {
  workspaceId: string;
  actorId: string;
  flagId: string;
  auditEventId: string;
}) {
  const event = await prisma.auditEvent.findFirst({
    where: {
      id: params.auditEventId,
      workspaceId: params.workspaceId,
      action: "FLAG_STATE_UPDATE",
      entityType: "FlagState",
    },
  });
  if (!event) {
    throw notFound("Audit event not found");
  }

  const flag = await prisma.flag.findFirst({
    where: { id: params.flagId, workspaceId: params.workspaceId, archivedAt: null },
    include: {
      states: { include: { rules: { orderBy: { order: "asc" } } } },
    },
  });
  if (!flag) {
    throw notFound("Flag not found");
  }

  const before = parseSnapshot(event.before, flag.type);
  const after = parseSnapshot(event.after, flag.type);
  if (before.flagId !== flag.id || after.flagId !== flag.id || before.stateId !== event.entityId || after.stateId !== event.entityId) {
    throw validationError({ snapshot: ["Audit event does not belong to this flag"] });
  }
  if (before.environmentId !== after.environmentId) {
    throw validationError({ snapshot: ["Audit event environment mismatch"] });
  }

  const current = flag.states.find((state) => state.id === event.entityId);
  if (!current) {
    throw notFound("Flag state not found");
  }
  if (current.version !== after.version) {
    throw conflict("Flag state changed after this audit event");
  }

  const currentSnapshot = toFlagStateAuditSnapshot({ flagId: flag.id, state: current });
  await prisma.$transaction(async (tx) => {
    const state = await tx.flagState.update({
      where: { id: current.id },
      data: {
        enabled: before.enabled,
        defaultValue: before.defaultValue as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
    await replaceRules(tx, state.id, before);
    const afterRollback = await tx.flagState.findUniqueOrThrow({
      where: { id: state.id },
      include: { rules: { orderBy: { order: "asc" } } },
    });
    const afterSnapshot = toFlagStateAuditSnapshot({
      flagId: flag.id,
      state: { ...afterRollback, environmentId: before.environmentId },
    });
    await writeAudit(tx, {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: "FLAG_STATE_ROLLBACK",
      entityType: "FlagState",
      entityId: state.id,
      before: currentSnapshot as Prisma.InputJsonValue,
      after: afterSnapshot as Prisma.InputJsonValue,
    });
    return afterRollback;
  });

  await publishSnapshot(before.environmentId);
  return getFlag(params.workspaceId, params.flagId);
}
