import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { indexSdkKeys } from "../src/lib/sdk-index.js";
import { publishSnapshot } from "../src/modules/flags/flags.snapshot.js";

const ADMIN_EMAIL = "admin@flare.local";
const ADMIN_PASSWORD = "flare-dev";

const SDK_KEYS = {
  dev: {
    sdkServerKey: "flr_s_dev_seed_local_only",
    sdkClientKey: "flr_c_dev_seed_local_only",
  },
  prod: {
    sdkServerKey: "flr_s_prod_seed_local_only",
    sdkClientKey: "flr_c_prod_seed_local_only",
  },
} as const;

async function upsertEnvironment(
  workspaceId: string,
  key: "dev" | "prod",
  name: string,
) {
  return prisma.environment.upsert({
    where: { workspaceId_key: { workspaceId, key } },
    update: {},
    create: {
      workspaceId,
      key,
      name,
      ...SDK_KEYS[key],
    },
  });
}

async function upsertFlagState(params: {
  flagId: string;
  environmentId: string;
  enabled: boolean;
  defaultValue: boolean | number | string;
  rules: Array<{
    type: "ALL" | "PERCENTAGE" | "USER_ALLOW" | "USER_DENY";
    order: number;
    percentage?: number;
    userIds?: string[];
    value?: boolean | number | string;
  }>;
}) {
  const state = await prisma.flagState.upsert({
    where: {
      flagId_environmentId: {
        flagId: params.flagId,
        environmentId: params.environmentId,
      },
    },
    update: {
      enabled: params.enabled,
      defaultValue: params.defaultValue,
      version: 1,
    },
    create: {
      flagId: params.flagId,
      environmentId: params.environmentId,
      enabled: params.enabled,
      defaultValue: params.defaultValue,
      version: 1,
    },
  });

  await prisma.rule.deleteMany({ where: { flagStateId: state.id } });

  if (params.rules.length > 0) {
    await prisma.rule.createMany({
      data: params.rules.map((rule) => ({
        flagStateId: state.id,
        type: rule.type,
        order: rule.order,
        percentage: rule.percentage ?? null,
        userIds: rule.userIds ?? [],
        value: rule.value ?? undefined,
      })),
    });
  }

  return state;
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: "Admin",
      passwordHash: await hashPassword(ADMIN_PASSWORD),
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo",
      slug: "demo",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
    },
    update: { role: "OWNER" },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: "OWNER",
    },
  });

  const [dev, prod] = await Promise.all([
    upsertEnvironment(workspace.id, "dev", "Development"),
    upsertEnvironment(workspace.id, "prod", "Production"),
  ]);

  const buyOneClick = await prisma.flag.upsert({
    where: {
      workspaceId_key: { workspaceId: workspace.id, key: "buy-one-click" },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      key: "buy-one-click",
      name: "Buy in 1 click",
      description: "Kill-switch for the one-click checkout button.",
      type: "BOOLEAN",
    },
  });

  const newFeed = await prisma.flag.upsert({
    where: {
      workspaceId_key: { workspaceId: workspace.id, key: "new-feed" },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      key: "new-feed",
      name: "New feed",
      description: "Percentage rollout for the new feed ranking.",
      type: "PERCENTAGE",
    },
  });

  for (const environment of [dev, prod]) {
    await upsertFlagState({
      flagId: buyOneClick.id,
      environmentId: environment.id,
      enabled: true,
      defaultValue: true,
      rules: [],
    });

    await upsertFlagState({
      flagId: newFeed.id,
      environmentId: environment.id,
      enabled: true,
      defaultValue: false,
      rules: [
        {
          type: "PERCENTAGE",
          order: 0,
          percentage: 10,
          value: true,
        },
      ],
    });
  }

  try {
    for (const environment of [dev, prod]) {
      await indexSdkKeys(environment);
      await publishSnapshot(environment.id);
    }
  } catch (err) {
    console.warn("Seed did not write Redis snapshots. Start the API to rebuild them.");
    console.warn(err);
  }

  console.log("Seed complete");
  console.log(`  login:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  workspace: ${workspace.slug}`);
  console.log(`  dev sdk:   ${SDK_KEYS.dev.sdkServerKey}`);
  console.log(`  prod sdk:  ${SDK_KEYS.prod.sdkServerKey}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
