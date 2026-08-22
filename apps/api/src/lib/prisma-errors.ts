export function isUniqueConstraintError(err: unknown, field?: string): boolean {
  if (!hasPrismaCode(err, "P2002")) {
    return false;
  }

  if (!field) {
    return true;
  }

  const target = "meta" in err && err.meta && typeof err.meta === "object" && "target" in err.meta
    ? err.meta.target
    : undefined;
  const fields = Array.isArray(target) ? target : [target];
  if (fields.every((item) => item === undefined)) {
    return true;
  }
  return fields.some((item) => String(item).includes(field));
}

function hasPrismaCode(err: unknown, code: string): err is { code: string; meta?: { target?: unknown } } {
  return Boolean(err && typeof err === "object" && "code" in err && err.code === code);
}
