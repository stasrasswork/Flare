import type { MembershipRole } from "../../generated/prisma/client.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { getAuth, getWorkspaceAuth } from "../../lib/auth-context.js";
import { forbidden, noWorkspace } from "../../lib/errors.js";
import { getSessionUserId } from "../../lib/session.js";
import { findMembership } from "../workspaces/workspaces.service.js";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  req.auth = { userId: await getSessionUserId(req) };
  next();
});

export const requireWorkspace = asyncHandler(async (req, _res, next) => {
  const { userId } = getAuth(req);
  const requested = req.header("x-workspace-id") ?? undefined;
  const membership = await findMembership(userId, requested);

  if (!membership) {
    throw noWorkspace();
  }

  req.auth = {
    userId,
    workspaceId: membership.workspaceId,
    role: membership.role,
  };
  next();
});

export function requireRole(...roles: MembershipRole[]) {
  return asyncHandler((req, _res, next) => {
    const { role } = getWorkspaceAuth(req);
    if (!roles.includes(role)) {
      throw forbidden();
    }
    next();
  });
}
