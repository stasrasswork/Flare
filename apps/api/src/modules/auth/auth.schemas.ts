import { z } from "zod";

export const emailSchema = z.email();
export const passwordSchema = z.string().min(8).max(128);
export const personNameSchema = z.string().trim().min(1).max(80);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: personNameSchema,
  workspaceName: personNameSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
