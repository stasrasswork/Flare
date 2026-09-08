import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { getWorkspaceAuth } from "../../lib/auth-context.js";
import { validationError } from "../../lib/errors.js";
import { requireAuth, requireRole, requireWorkspace } from "../auth/auth.middleware.js";
import { auditListQuerySchema, rollbackParamsSchema } from "./audit.schema.js";
import { listFlagAuditEvents, rollbackFlagState } from "./audit.service.js";

export const auditRouter = Router();
auditRouter.use("/flags", requireAuth, requireWorkspace);

auditRouter.get(
  "/flags/:flagId/audit",
  asyncHandler(async (req, res) => {
    const parsed = auditListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw validationError(parsed.error.flatten());
    }
    const { workspaceId } = getWorkspaceAuth(req);
    const result = await listFlagAuditEvents({
      workspaceId,
      flagId: String(req.params.flagId),
      ...parsed.data,
    });
    res.json(result);
  }),
);

auditRouter.post(
  "/flags/:flagId/audit/:eventId/rollback",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = rollbackParamsSchema.safeParse({
      flagId: req.params.flagId,
      eventId: req.params.eventId,
    });
    if (!parsed.success) {
      throw validationError(parsed.error.flatten());
    }
    const { userId, workspaceId } = getWorkspaceAuth(req);
    const flag = await rollbackFlagState({
      workspaceId,
      actorId: userId,
      flagId: parsed.data.flagId,
      auditEventId: parsed.data.eventId,
    });
    res.json({ flag });
  }),
);
