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
      if (!validFlags(message.flags)) {
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

function validFlags(flags: object): flags is FlagSnapshot["flags"] {
  return Object.values(flags).every((flag) => {
    if (typeof flag !== "object" || flag === null || Array.isArray(flag)) {
      return false;
    }
    const candidate = flag as Record<string, unknown>;
    if (
      (candidate.type !== "BOOLEAN" && candidate.type !== "PERCENTAGE" && candidate.type !== "STRING") ||
      typeof candidate.enabled !== "boolean" ||
      !Array.isArray(candidate.rules)
    ) {
      return false;
    }
    const valueIsValid = candidate.type === "STRING"
      ? typeof candidate.defaultValue === "string"
      : typeof candidate.defaultValue === "boolean";
    return valueIsValid && candidate.rules.every(validRule(candidate.type));
  });
}

function validRule(type: "BOOLEAN" | "PERCENTAGE" | "STRING") {
  return (rule: unknown): boolean => {
    if (typeof rule !== "object" || rule === null || Array.isArray(rule)) {
      return false;
    }
    const candidate = rule as Record<string, unknown>;
    if (
      candidate.type !== "ALL" &&
      candidate.type !== "PERCENTAGE" &&
      candidate.type !== "USER_ALLOW" &&
      candidate.type !== "USER_DENY"
    ) {
      return false;
    }
    if (candidate.value === undefined) {
      return true;
    }
    return type === "STRING" ? typeof candidate.value === "string" : typeof candidate.value === "boolean";
  };
}
