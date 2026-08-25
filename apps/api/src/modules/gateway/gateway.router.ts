import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { getWorkspaceAuth } from "../../lib/auth-context.js";
import { requireAuth, requireWorkspace } from "../auth/auth.middleware.js";
import { requireEnvironmentInWorkspace } from "../workspaces/workspaces.service.js";
import { presenceCount } from "./presence.js";

export const gatewayRouter = Router();

gatewayRouter.get(
  "/environments/:envId/connections",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req, res) => {
    const { workspaceId } = getWorkspaceAuth(req);
    const envId = String(req.params.envId);
    await requireEnvironmentInWorkspace(workspaceId, envId);
    res.json({ count: await presenceCount(envId) });
  }),
);
