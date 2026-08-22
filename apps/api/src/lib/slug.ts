import { randomBytes } from "node:crypto";

export function slugify(
  value: string,
  options?: { fallback?: string; maxLength?: number },
): string {
  const fallback = options?.fallback ?? "item";
  const maxLength = options?.maxLength ?? 40;

  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, maxLength) || fallback
  );
}

export function uniqueSlug(value: string, options?: { fallback?: string; maxLength?: number }): string {
  return `${slugify(value, options)}-${randomBytes(3).toString("hex")}`;
}
