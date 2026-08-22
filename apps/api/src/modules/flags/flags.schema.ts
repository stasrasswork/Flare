import { z } from "zod";

export const flagKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const flagTypeSchema = z.enum(["BOOLEAN", "PERCENTAGE", "STRING"]);
export const ruleTypeSchema = z.enum(["ALL", "PERCENTAGE", "USER_ALLOW", "USER_DENY"]);

export const flagValueSchema = z.union([z.boolean(), z.number(), z.string()]);

export const ruleSchema = z
  .object({
    type: ruleTypeSchema,
    percentage: z.number().int().min(0).max(100).optional(),
    userIds: z.array(z.string().min(1)).max(1000).optional(),
    value: flagValueSchema.optional(),
  })
  .superRefine((rule, ctx) => {
    if (rule.type === "PERCENTAGE" && rule.percentage === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "percentage is required",
        path: ["percentage"],
      });
    }

    if (
      (rule.type === "USER_ALLOW" || rule.type === "USER_DENY") &&
      (!rule.userIds || rule.userIds.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "userIds is required",
        path: ["userIds"],
      });
    }
  });

export const createFlagSchema = z.object({
  key: flagKeySchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).optional(),
  type: flagTypeSchema,
});

export const updateFlagSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined);

export const updateFlagStateSchema = z
  .object({
    enabled: z.boolean().optional(),
    defaultValue: flagValueSchema.optional(),
    rules: z.array(ruleSchema).max(50).optional(),
  })
  .refine(
    (value) =>
      value.enabled !== undefined ||
      value.defaultValue !== undefined ||
      value.rules !== undefined,
  );

export type CreateFlagInput = z.infer<typeof createFlagSchema>;
export type UpdateFlagInput = z.infer<typeof updateFlagSchema>;
export type UpdateFlagStateInput = z.infer<typeof updateFlagStateSchema>;
export type RuleInput = z.infer<typeof ruleSchema>;
