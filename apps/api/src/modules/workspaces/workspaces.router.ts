import { Router } from "express";
import { getWorkspaceAuth } from "../../lib/auth-context.js";
import { requireAuth, requireWorkspace } from "../auth/auth.middleware.js";
import { getWorkspaceForUser } from "./workspaces.service.js";

export const workspacesRouter = Router();

workspacesRouter.get(
  "/workspaces/me",
  requireAuth,
  requireWorkspace,
  async (req, res) => {
    const { userId, workspaceId } = getWorkspaceAuth(req);
    const workspace = await getWorkspaceForUser(userId, workspaceId);
    res.json({ workspace });
  },
);
