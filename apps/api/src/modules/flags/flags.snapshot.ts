import type { FlagType } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { toFlagValue } from "./flags.dto.js";

export type SnapshotRule = {
  type: "ALL" | "PERCENTAGE" | "USER_ALLOW" | "USER_DENY";
  percentage?: number;
  userIds?: string[];
  value?: boolean | number | string;
};

export type SnapshotFlag = {
  type: FlagType;
  enabled: boolean;
  defaultValue: boolean | number | string;
  rules: SnapshotRule[];
};

export type FlagSnapshot = {
  version: number;
  flags: Record<string, SnapshotFlag>;
};

export function snapshotKey(envId: string): string {
  return `flags:${envId}:snapshot`;
}

export function snapshotChannel(envId: string): string {
  return `flags:${envId}`;
}

export async function buildSnapshot(envId: string): Promise<FlagSnapshot> {
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
  let version = 0;

  for (const state of states) {
    version = Math.max(version, state.version);
    flags[state.flag.key] = {
      type: state.flag.type,
      enabled: state.enabled,
      defaultValue: toFlagValue(state.defaultValue) ?? false,
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

  return { version, flags };
}

export async function publishSnapshot(envId: string): Promise<FlagSnapshot> {
  const snapshot = await buildSnapshot(envId);
  await redis.set(snapshotKey(envId), JSON.stringify(snapshot));
  await redis.publish(snapshotChannel(envId), JSON.stringify({ version: snapshot.version }));
  return snapshot;
}

export async function publishSnapshots(envIds: string[]): Promise<void> {
  await Promise.all(envIds.map((envId) => publishSnapshot(envId)));
}

export async function rebuildAllSnapshots(): Promise<void> {
  const environments = await prisma.environment.findMany({ select: { id: true } });
  const results = await Promise.allSettled(
    environments.map((environment) => publishSnapshot(environment.id)),
  );
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    console.error(`Failed to rebuild ${failed.length} flag snapshot(s)`);
  }
}
