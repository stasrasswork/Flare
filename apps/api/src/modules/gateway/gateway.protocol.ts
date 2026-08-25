import { z } from "zod";
import type { FlagSnapshot } from "../flags/flags.snapshot-types.js";

export const STREAM_PATH = "/v1/stream";

export const HELLO_TIMEOUT_MS = 5_000;
export const PING_INTERVAL_MS = 20_000;
export const PONG_TIMEOUT_MS = 10_000;
export const MAX_PAYLOAD_BYTES = 8 * 1024;

export const WsClose = {
  HELLO_TIMEOUT: 4001,
  BAD_MESSAGE: 4400,
  UNAUTHORIZED: 4401,
  NOT_FOUND: 4404,
} as const;

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hello"),
    sdkKey: z.string().trim().min(1).max(256),
    sdk: z.enum(["node", "react"]),
    version: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal("resync"),
    version: z.number().int().nonnegative(),
  }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export type ServerErrorCode = "UNAUTHORIZED" | "NOT_FOUND" | "BAD_MESSAGE";

export type ServerMessage =
  | { type: "snapshot"; version: number; flags: FlagSnapshot["flags"] }
  | { type: "error"; code: ServerErrorCode; message: string };

export function snapshotMessage(snapshot: FlagSnapshot): ServerMessage {
  return { type: "snapshot", version: snapshot.version, flags: snapshot.flags };
}

export function errorMessage(code: ServerErrorCode, message: string): ServerMessage {
  return { type: "error", code, message };
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = clientMessageSchema.safeParse(parsed);
  return result.success ? result.data : null;
}
