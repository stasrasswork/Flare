import { Router } from "express";
import { getWorkspaceAuth } from "../../lib/auth-context.js";
import { parseBody } from "../../lib/http.js";
import { requireAuth, requireWorkspace } from "../auth/auth.middleware.js";
import { createFlagSchema, updateFlagSchema, updateFlagStateSchema } from "./flags.schema.js";
import { archiveFlag, createFlag, getFlag, listFlags, updateFlag, updateFlagState } from "./flags.service.js";

export const flagsRouter = Router();

flagsRouter.use(requireAuth, requireWorkspace);

flagsRouter.get("/flags", async (req, res) => {
  const { workspaceId } = getWorkspaceAuth(req);
  res.json({ flags: await listFlags(workspaceId) });
});

flagsRouter.post("/flags", async (req, res) => {
  const { userId, workspaceId } = getWorkspaceAuth(req);
  const flag = await createFlag({
    workspaceId,
    actorId: userId,
    input: parseBody(createFlagSchema, req.body),
  });
  res.status(201).json({ flag });
});

flagsRouter.get("/flags/:id", async (req, res) => {
  const { workspaceId } = getWorkspaceAuth(req);
  res.json({ flag: await getFlag(workspaceId, req.params.id) });
});

flagsRouter.patch("/flags/:id", async (req, res) => {
  const { userId, workspaceId } = getWorkspaceAuth(req);
  const flag = await updateFlag({
    workspaceId,
    actorId: userId,
    flagId: req.params.id,
    input: parseBody(updateFlagSchema, req.body),
  });
  res.json({ flag });
});

flagsRouter.delete("/flags/:id", async (req, res) => {
  const { userId, workspaceId } = getWorkspaceAuth(req);
  const flag = await archiveFlag({
    workspaceId,
    actorId: userId,
    flagId: req.params.id,
  });
  res.json({ flag });
});

flagsRouter.put("/flags/:id/environments/:envId", async (req, res) => {
  const { userId, workspaceId } = getWorkspaceAuth(req);
  const flag = await updateFlagState({
    workspaceId,
    actorId: userId,
    flagId: req.params.id,
    environmentId: req.params.envId,
    input: parseBody(updateFlagStateSchema, req.body),
  });
  res.json({ flag });
});
