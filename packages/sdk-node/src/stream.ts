import { WebSocket } from "ws";
import { nextDelayMs } from "./backoff.js";
import { FlareAuthError } from "./errors.js";
import { helloMessage, parseServerMessage, WsClose } from "./protocol.js";
import type { FlagSnapshot } from "./types.js";

export type StreamHandlers = {
  onSnapshot: (snapshot: FlagSnapshot) => void;
  onDisconnect: (code?: number) => void;
  onReconnect: (attempt: number) => void;
  onFatal: (error: Error) => void;
};

export type Stream = {
  close: () => void;
};

type ConnectStreamOptions = {
  sdkKey: string;
  url: string;
  getVersion: () => number | null;
  handlers: StreamHandlers;
};

function readText(data: WebSocket.RawData): string | undefined {
  if (typeof data === "string") {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }
  return undefined;
}

export function connectStream(options: ConnectStreamOptions): Stream {
  const { sdkKey, url, getVersion, handlers } = options;

  let socket: WebSocket | undefined;
  let reconnectTimer: NodeJS.Timeout | undefined;
  let attempt = 0;
  let userClosed = false;
  let fatal = false;

  function clearReconnect(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  }

  function disposeSocket(): void {
    if (!socket) {
      return;
    }
    const current = socket;
    socket = undefined;
    current.removeAllListeners();
    if (current.readyState === WebSocket.CONNECTING || current.readyState === WebSocket.OPEN) {
      current.close();
    }
  }

  function fail(error: Error): void {
    if (fatal || userClosed) {
      return;
    }
    fatal = true;
    clearReconnect();
    disposeSocket();
    handlers.onFatal(error);
  }

  function scheduleReconnect(): void {
    if (userClosed || fatal || reconnectTimer) {
      return;
    }
    const delay = nextDelayMs(attempt);
    attempt += 1;
    handlers.onReconnect(attempt);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  }

  function connect(): void {
    if (userClosed || fatal || socket) {
      return;
    }

    const ws = new WebSocket(url);
    socket = ws;

    ws.on("open", () => {
      if (userClosed || fatal) {
        ws.close();
        return;
      }
      ws.send(JSON.stringify(helloMessage(sdkKey, getVersion() ?? 0)));
    });

    ws.on("message", (data) => {
      if (userClosed || fatal) {
        return;
      }

      const text = readText(data);
      if (text === undefined) {
        return;
      }

      const message = parseServerMessage(text);
      if (!message) {
        return;
      }

      if (message.type === "error") {
        if (message.code === "UNAUTHORIZED") {
          fail(new FlareAuthError(message.message));
        }
        return;
      }

      attempt = 0;
      handlers.onSnapshot({ version: message.version, flags: message.flags });
    });

    ws.on("close", (code) => {
      if (socket === ws) {
        socket = undefined;
      }
      if (userClosed) {
        return;
      }
      handlers.onDisconnect(code);
      if (fatal) {
        return;
      }
      if (code === WsClose.UNAUTHORIZED) {
        fail(new FlareAuthError());
        return;
      }
      scheduleReconnect();
    });

    ws.on("error", () => {
      // `close` follows; reconnect is scheduled there.
    });
  }

  connect();

  return {
    close() {
      if (userClosed) {
        return;
      }
      userClosed = true;
      clearReconnect();
      disposeSocket();
    },
  };
}
