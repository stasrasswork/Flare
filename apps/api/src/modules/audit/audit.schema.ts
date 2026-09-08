import { z } from "zod";

export const auditListQuerySchema = z.object({
  environmentId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).optional(),
});

export const rollbackParamsSchema = z.object({
  flagId: z.string().min(1),
  eventId: z.string().min(1),
});
