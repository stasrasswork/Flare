import type { Request } from "express";
import type { MembershipRole } from "../generated/prisma/client.js";
import { noWorkspace, unauthorized } from "./errors.js";

export type AuthContext = {
  userId: string;
  workspaceId?: string;
  role?: MembershipRole;
};

export type WorkspaceAuthContext = AuthContext & {
  workspaceId: string;
  role: MembershipRole;
};

export function getAuth(req: Request): AuthContext {
  if (!req.auth?.userId) {
    throw unauthorized();
  }
  return req.auth;
}

export function getWorkspaceAuth(req: Request): WorkspaceAuthContext {
  const auth = getAuth(req);
  if (!auth.workspaceId || !auth.role) {
    throw noWorkspace();
  }
  return { ...auth, workspaceId: auth.workspaceId, role: auth.role };
}
