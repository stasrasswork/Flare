import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { getWorkspaceAuth } from "../../lib/auth-context.js";
import { parseBody } from "../../lib/http.js";
import { requireAuth, requireRole, requireWorkspace } from "../auth/auth.middleware.js";
import { createFlagSchema, updateFlagSchema, updateFlagStateSchema } from "./flags.schema.js";
import { archiveFlag, createFlag, getFlag, listFlags, updateFlag, updateFlagState } from "./flags.service.js";

export const flagsRouter = Router();

flagsRouter.use("/flags", requireAuth, requireWorkspace);

flagsRouter.get(
  "/flags",
  asyncHandler(async (req, res) => {
    const { workspaceId } = getWorkspaceAuth(req);
    res.json({ flags: await listFlags(workspaceId) });
  }),
);

flagsRouter.post(
  "/flags",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { userId, workspaceId } = getWorkspaceAuth(req);
    const flag = await createFlag({
      workspaceId,
      actorId: userId,
      input: parseBody(createFlagSchema, req.body),
    });
    res.status(201).json({ flag });
  }),
);

flagsRouter.get(
  "/flags/:id",
  asyncHandler(async (req, res) => {
    const { workspaceId } = getWorkspaceAuth(req);
    res.json({ flag: await getFlag(workspaceId, String(req.params.id)) });
  }),
);

flagsRouter.patch(
  "/flags/:id",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { userId, workspaceId } = getWorkspaceAuth(req);
    const flag = await updateFlag({
      workspaceId,
      actorId: userId,
      flagId: String(req.params.id),
      input: parseBody(updateFlagSchema, req.body),
    });
    res.json({ flag });
  }),
);

flagsRouter.delete(
  "/flags/:id",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { userId, workspaceId } = getWorkspaceAuth(req);
    const flag = await archiveFlag({
      workspaceId,
      actorId: userId,
      flagId: String(req.params.id),
    });
    res.json({ flag });
  }),
);

flagsRouter.put(
  "/flags/:id/environments/:envId",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { userId, workspaceId } = getWorkspaceAuth(req);
    const flag = await updateFlagState({
      workspaceId,
      actorId: userId,
      flagId: String(req.params.id),
      environmentId: String(req.params.envId),
      input: parseBody(updateFlagStateSchema, req.body),
    });
    res.json({ flag });
  }),
);
