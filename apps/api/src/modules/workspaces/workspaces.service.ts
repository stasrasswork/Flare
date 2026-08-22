import { notFound, noWorkspace } from "../../lib/errors.js";
import { type DbClient, prisma } from "../../lib/prisma.js";
import { isUniqueConstraintError } from "../../lib/prisma-errors.js";
import { createSdkKeyPair } from "../../lib/sdk-keys.js";
import { uniqueSlug } from "../../lib/slug.js";
import { toWorkspaceDto } from "./workspaces.dto.js";

const DEFAULT_ENVIRONMENTS = [
  { key: "dev", name: "Development" },
  { key: "prod", name: "Production" },
] as const;

export async function createWorkspace(
  params: { ownerId: string; name: string },
  db: DbClient = prisma,
) {
  const create = async (slug: string) =>
    db.workspace.create({
      data: {
        name: params.name,
        slug,
        members: {
          create: { userId: params.ownerId, role: "OWNER" },
        },
        environments: {
          create: DEFAULT_ENVIRONMENTS.map((environment) => ({
            ...environment,
            ...createSdkKeyPair(),
          })),
        },
      },
      include: { environments: { orderBy: { key: "asc" } } },
    });

  try {
    const workspace = await create(uniqueSlug(params.name, { fallback: "workspace" }));
    return toWorkspaceDto(workspace, "OWNER");
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      const workspace = await create(uniqueSlug(params.name, { fallback: "workspace" }));
      return toWorkspaceDto(workspace, "OWNER");
    }
    throw err;
  }
}

export async function findMembership(userId: string, workspaceId?: string) {
  if (workspaceId) {
    return prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
  }

  return prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWorkspaceForUser(userId: string, workspaceId?: string) {
  const membership = await findMembership(userId, workspaceId);
  if (!membership) {
    throw noWorkspace();
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: membership.workspaceId },
    include: { environments: { orderBy: { key: "asc" } } },
  });

  if (!workspace) {
    throw notFound("Workspace not found");
  }

  return toWorkspaceDto(workspace, membership.role);
}
