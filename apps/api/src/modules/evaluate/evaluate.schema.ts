import { z } from "zod";

export const evaluateSchema = z.object({
  flagKey: z.string().trim().min(1).max(64),
  context: z
    .object({
      userId: z.string().trim().min(1).max(128).optional(),
    })
    .optional(),
});

export type EvaluateInput = z.infer<typeof evaluateSchema>;
