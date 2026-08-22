import { Prisma } from "../generated/prisma/client.js";

export function isUniqueConstraintError(err: unknown, field?: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return false;
  }

  if (!field) {
    return true;
  }

  const target = err.meta?.target;
  const fields = Array.isArray(target) ? target : [target];
  return fields.some((item) => String(item).includes(field));
}
