import { Prisma, type FlagType } from "../../generated/prisma/client.js";
import { flagKeyTaken, notFound } from "../../lib/errors.js";
import { type DbClient, prisma } from "../../lib/prisma.js";
import { isUniqueConstraintError } from "../../lib/prisma-errors.js";
import { toFlagDto, toFlagValue } from "./flags.dto.js";
import type { CreateFlagInput, RuleInput, UpdateFlagInput, UpdateFlagStateInput } from "./flags.schema.js";
import { publishSnapshot, publishSnapshots } from "./flags.snapshot.js";

const flagInclude = {
  states: {
    include: { rules: { orderBy: { order: "asc" as const } } },
    orderBy: { environmentId: "asc" as const },
  },
};

function initialState(type: FlagType): {
  enabled: boolean;
  defaultValue: Prisma.InputJsonValue;
  rules: RuleInput[];
} {
  switch (type) {
    case "BOOLEAN":
      return { enabled: false, defaultValue: false, rules: [] };
    case "PERCENTAGE":
      return {
        enabled: true,
        defaultValue: false,
        rules: [{ type: "PERCENTAGE", percentage: 0, value: true }],
      };
    case "STRING":
      return { enabled: false, defaultValue: "", rules: [] };
  }
}

function toRuleData(rule: RuleInput, order: number) {
  return {
    type: rule.type,
    order,
    percentage: rule.percentage ?? null,
    userIds: rule.userIds ?? [],
    value: rule.value ?? undefined,
  };
}

async function writeAudit(
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
  await db.auditEvent.create({ data });
}

async function replaceRules(db: DbClient, flagStateId: string, rules: RuleInput[]) {
  await db.rule.deleteMany({ where: { flagStateId } });
  if (rules.length === 0) {
    return;
  }
  await db.rule.createMany({
    data: rules.map((rule, order) => ({
      flagStateId,
      ...toRuleData(rule, order),
    })),
  });
}

async function getWorkspaceEnvIds(workspaceId: string): Promise<string[]> {
  const environments = await prisma.environment.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  return environments.map((environment) => environment.id);
}

async function findFlagOrThrow(workspaceId: string, flagId: string, includeArchived = false) {
  const flag = await prisma.flag.findFirst({
    where: {
      id: flagId,
      workspaceId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    include: flagInclude,
  });

  if (!flag) {
    throw notFound("Flag not found");
  }

  return flag;
}

export async function listFlags(workspaceId: string) {
  const flags = await prisma.flag.findMany({
    where: { workspaceId, archivedAt: null },
    include: flagInclude,
    orderBy: { createdAt: "asc" },
  });
  return flags.map(toFlagDto);
}

export async function getFlag(workspaceId: string, flagId: string) {
  return toFlagDto(await findFlagOrThrow(workspaceId, flagId));
}

export async function createFlag(params: {
  workspaceId: string;
  actorId: string;
  input: CreateFlagInput;
}) {
  const environments = await prisma.environment.findMany({
    where: { workspaceId: params.workspaceId },
    select: { id: true },
  });

  const defaults = initialState(params.input.type);

  try {
    const flag = await prisma.$transaction(async (tx) => {
      const created = await tx.flag.create({
        data: {
          workspaceId: params.workspaceId,
          key: params.input.key,
          name: params.input.name,
          description: params.input.description,
          type: params.input.type,
          states: {
            create: environments.map((environment) => ({
              environmentId: environment.id,
              enabled: defaults.enabled,
              defaultValue: defaults.defaultValue,
              version: 1,
              rules: {
                create: defaults.rules.map((rule, order) => toRuleData(rule, order)),
              },
            })),
          },
        },
        include: flagInclude,
      });

      await writeAudit(tx, {
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        action: "FLAG_CREATE",
        entityType: "Flag",
        entityId: created.id,
        after: toFlagDto(created) as unknown as Prisma.InputJsonValue,
      });

      return created;
    });

    await publishSnapshots(environments.map((environment) => environment.id));
    return toFlagDto(flag);
  } catch (err) {
    if (isUniqueConstraintError(err, "key")) {
      throw flagKeyTaken();
    }
    throw err;
  }
}

export async function updateFlag(params: {
  workspaceId: string;
  actorId: string;
  flagId: string;
  input: UpdateFlagInput;
}) {
  const before = await findFlagOrThrow(params.workspaceId, params.flagId);

  const flag = await prisma.$transaction(async (tx) => {
    const updated = await tx.flag.update({
      where: { id: before.id },
      data: {
        name: params.input.name,
        description: params.input.description,
      },
      include: flagInclude,
    });

    await writeAudit(tx, {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: "FLAG_UPDATE",
      entityType: "Flag",
      entityId: updated.id,
      before: toFlagDto(before) as unknown as Prisma.InputJsonValue,
      after: toFlagDto(updated) as unknown as Prisma.InputJsonValue,
    });

    return updated;
  });

  return toFlagDto(flag);
}

export async function archiveFlag(params: {
  workspaceId: string;
  actorId: string;
  flagId: string;
}) {
  const before = await findFlagOrThrow(params.workspaceId, params.flagId);

  const flag = await prisma.$transaction(async (tx) => {
    const archived = await tx.flag.update({
      where: { id: before.id },
      data: { archivedAt: new Date() },
      include: flagInclude,
    });

    await writeAudit(tx, {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: "FLAG_ARCHIVE",
      entityType: "Flag",
      entityId: archived.id,
      before: toFlagDto(before) as unknown as Prisma.InputJsonValue,
      after: toFlagDto(archived) as unknown as Prisma.InputJsonValue,
    });

    return archived;
  });

  await publishSnapshots(await getWorkspaceEnvIds(params.workspaceId));
  return toFlagDto(flag);
}

export async function updateFlagState(params: {
  workspaceId: string;
  actorId: string;
  flagId: string;
  environmentId: string;
  input: UpdateFlagStateInput;
}) {
  const flag = await findFlagOrThrow(params.workspaceId, params.flagId);

  const environment = await prisma.environment.findFirst({
    where: { id: params.environmentId, workspaceId: params.workspaceId },
  });
  if (!environment) {
    throw notFound("Environment not found");
  }

  const before = flag.states.find((state) => state.environmentId === params.environmentId);
  if (!before) {
    throw notFound("Flag state not found");
  }

  await prisma.$transaction(async (tx) => {
    const state = await tx.flagState.update({
      where: { id: before.id },
      data: {
        enabled: params.input.enabled ?? before.enabled,
        defaultValue: params.input.defaultValue ?? toFlagValue(before.defaultValue) ?? false,
        version: { increment: 1 },
      },
    });

    if (params.input.rules) {
      await replaceRules(tx, state.id, params.input.rules);
    }

    const after = await tx.flagState.findUniqueOrThrow({
      where: { id: state.id },
      include: { rules: { orderBy: { order: "asc" } } },
    });

    await writeAudit(tx, {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: "FLAG_STATE_UPDATE",
      entityType: "FlagState",
      entityId: state.id,
      before: {
        enabled: before.enabled,
        defaultValue: before.defaultValue,
        version: before.version,
        rules: before.rules,
      } as Prisma.InputJsonValue,
      after: {
        enabled: after.enabled,
        defaultValue: after.defaultValue,
        version: after.version,
        rules: after.rules,
      } as Prisma.InputJsonValue,
    });
  });

  await publishSnapshot(params.environmentId);
  return getFlag(params.workspaceId, params.flagId);
}
