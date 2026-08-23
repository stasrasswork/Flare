import { indexSdkKeys } from "../../lib/sdk-index.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { toFlagValue } from "./flags.dto.js";
import {
  snapshotChannel,
  snapshotKey,
  snapshotRevisionKey,
  type FlagSnapshot,
  type SnapshotFlagType,
  type SnapshotRule,
} from "./flags.snapshot-types.js";

export type { FlagSnapshot, SnapshotFlag, SnapshotRule } from "./flags.snapshot-types.js";
export { snapshotChannel, snapshotKey } from "./flags.snapshot-types.js";

function fallbackValue(type: SnapshotFlagType): boolean | string {
  return type === "STRING" ? "" : false;
}

export async function buildSnapshotFlags(envId: string): Promise<FlagSnapshot["flags"]> {
  const states = await prisma.flagState.findMany({
    where: {
      environmentId: envId,
      flag: { archivedAt: null },
    },
    include: {
      flag: true,
      rules: { orderBy: { order: "asc" } },
    },
  });

  const flags: FlagSnapshot["flags"] = {};

  for (const state of states) {
    flags[state.flag.key] = {
      type: state.flag.type,
      enabled: state.enabled,
      defaultValue: toFlagValue(state.defaultValue) ?? fallbackValue(state.flag.type),
      rules: state.rules.map((rule) => {
        const mapped: SnapshotRule = { type: rule.type };
        if (rule.percentage !== null) {
          mapped.percentage = rule.percentage;
        }
        if (rule.userIds.length > 0) {
          mapped.userIds = rule.userIds;
        }
        const value = toFlagValue(rule.value);
        if (value !== null) {
          mapped.value = value;
        }
        return mapped;
      }),
    };
  }

  return flags;
}

export async function publishSnapshot(envId: string): Promise<FlagSnapshot> {
  const flags = await buildSnapshotFlags(envId);
  const version = await redis.incr(snapshotRevisionKey(envId));
  const snapshot: FlagSnapshot = { version, flags };

  await redis.set(snapshotKey(envId), JSON.stringify(snapshot));
  await redis.publish(snapshotChannel(envId), JSON.stringify({ version }));

  return snapshot;
}

export async function publishSnapshots(envIds: string[]): Promise<void> {
  await Promise.all(envIds.map((envId) => publishSnapshot(envId)));
}

export async function rebuildAllSnapshots(): Promise<void> {
  const environments = await prisma.environment.findMany({
    select: { id: true, sdkServerKey: true, sdkClientKey: true },
  });

  const results = await Promise.allSettled(
    environments.map(async (environment) => {
      await indexSdkKeys(environment);
      await publishSnapshot(environment.id);
    }),
  );

  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    console.error(`Failed to rebuild ${failed.length} flag snapshot(s)`);
    throw new Error(`Failed to rebuild ${failed.length} flag snapshot(s)`);
  }
}
