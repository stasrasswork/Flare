import type { FlagSnapshot } from "./types.js";

export const STREAM_PATH = "/v1/stream";

export const WsClose = {
  HELLO_TIMEOUT: 4001,
  BAD_MESSAGE: 4400,
  UNAUTHORIZED: 4401,
  NOT_FOUND: 4404,
} as const;

export type ServerErrorCode = "UNAUTHORIZED" | "NOT_FOUND" | "BAD_MESSAGE";

export type HelloMessage = {
  type: "hello";
  sdkKey: string;
  sdk: "node";
  version: number;
};

export type ResyncMessage = {
  type: "resync";
  version: number;
};

export type ServerMessage =
  | { type: "snapshot"; version: number; flags: FlagSnapshot["flags"] }
  | { type: "error"; code: ServerErrorCode; message: string };

export function helloMessage(sdkKey: string, version: number): HelloMessage {
  return { type: "hello", sdkKey, sdk: "node", version };
}

export function resyncMessage(version: number): ResyncMessage {
  return { type: "resync", version };
}

export function parseServerMessage(raw: string): ServerMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const message = parsed as Record<string, unknown>;

  if (message.type === "snapshot") {
    if (typeof message.version !== "number" || !Number.isInteger(message.version) || message.version < 0) {
      return null;
    }
    if (typeof message.flags !== "object" || message.flags === null || Array.isArray(message.flags)) {
      return null;
    }
    return {
      type: "snapshot",
      version: message.version,
      flags: message.flags as FlagSnapshot["flags"],
    };
  }

  if (message.type === "error") {
    if (message.code !== "UNAUTHORIZED" && message.code !== "NOT_FOUND" && message.code !== "BAD_MESSAGE") {
      return null;
    }
    if (typeof message.message !== "string") {
      return null;
    }
    return { type: "error", code: message.code, message: message.message };
  }

  return null;
}
