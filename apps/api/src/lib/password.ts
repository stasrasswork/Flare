import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) {
    return false;
  }

  const next = (await scrypt(password, salt, KEYLEN)) as Buffer;
  const actual = Buffer.from(hash, "hex");
  if (actual.length !== next.length) {
    return false;
  }
  return timingSafeEqual(actual, next);
}
