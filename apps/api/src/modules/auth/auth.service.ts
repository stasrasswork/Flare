import { emailTaken, invalidCredentials, unauthorized } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import { isUniqueConstraintError } from "../../lib/prisma-errors.js";
import { toWorkspaceSummaryDto } from "../workspaces/workspaces.dto.js";
import { createWorkspace } from "../workspaces/workspaces.service.js";
import { toUserDto, type MeDto } from "./auth.dto.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

export async function register(input: RegisterInput) {
  const email = input.email.toLowerCase();

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: input.name,
          passwordHash: hashPassword(input.password),
        },
      });

      await createWorkspace(
        {
          ownerId: created.id,
          name: input.workspaceName?.trim() || `${input.name}'s workspace`,
        },
        tx,
      );

      return created;
    });

    return toUserDto(user);
  } catch (err) {
    if (isUniqueConstraintError(err, "email")) {
      throw emailTaken();
    }
    throw err;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw invalidCredentials();
  }

  return toUserDto(user);
}

export async function getMe(userId: string): Promise<MeDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        orderBy: { createdAt: "asc" },
        include: { workspace: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  if (!user) {
    throw unauthorized();
  }

  return {
    user: toUserDto(user),
    workspaces: user.memberships.map((membership) =>
      toWorkspaceSummaryDto(membership.workspace, membership.role),
    ),
  };
}
